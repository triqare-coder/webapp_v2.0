/**
 * Turns an APPROVED driver application into an account that can actually log in.
 *
 * The bug this fixes: approving an application only flipped a status flag and sent
 * an email. No Clerk identity was ever created, and mobile sign-in is Clerk-first —
 * so every "approved" driver hit `form_identifier_not_found` ("We couldn't find an
 * account with that email") and Forgot Password couldn't find them either. The
 * driver existed in Supabase (or not at all) but had no login.
 *
 * Provisioning creates, in order:
 *   1. a Clerk user (role=driver) in whichever instance CLERK_SECRET_KEY points at,
 *   2. the Supabase `users` row, LINKED via clerk_user_id (updating an existing row
 *      for that email rather than inserting a duplicate),
 *   3. the `drivers` row carrying the licence/vehicle details from the application.
 *
 * IMPORTANT (instance alignment): the Clerk account lands in the instance of
 * CLERK_SECRET_KEY. The mobile app authenticates against the instance of its own
 * publishable key. If those two differ, the driver STILL won't be found by the app.
 * Both must be the same Clerk instance.
 *
 * Idempotent: safe to re-run for the same application (reuses an existing Clerk
 * user / updates existing rows), so a failed approval can simply be retried.
 */

import { createClerkClient } from '@clerk/nextjs/server'
import { randomBytes } from 'crypto'

import { createServerClient } from '@/lib/supabase/server'
import { decryptField } from '@/lib/crypto/fieldEncryption'
import type { DriverApplicationRow } from './driverApplicationService'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

export interface ProvisionResult {
  clerkUserId: string
  userId: string
  /** Set only when we just created the Clerk account, so the approval email can carry it. */
  tempPassword: string | null
}

/** Random 18+ char password — passes Clerk's strength and breach checks. */
function generateTempPassword(): string {
  return `Tq${randomBytes(12).toString('base64url')}!7`
}

function tryDecrypt(ciphertext: string, iv: string, tag: string): string | null {
  try {
    return decryptField({ ciphertext, iv, tag })
  } catch {
    return null // ENCRYPTION_KEY missing/rotated — fall back to the masked last4
  }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] || 'Driver', lastName: parts.slice(1).join(' ') }
}

export async function provisionApprovedDriver(app: DriverApplicationRow): Promise<ProvisionResult> {
  const email = app.email.trim().toLowerCase()
  const { firstName, lastName } = splitName(app.full_name)

  // ── 1. Clerk identity (reuse if this email already has one) ────────────────
  let clerkUserId: string
  let tempPassword: string | null = null

  const existing = await clerkClient.users.getUserList({ emailAddress: [email] })
  if (existing.data.length > 0) {
    const found = existing.data[0]
    clerkUserId = found.id
    // Make sure the role metadata marks them a driver (the app routes on this).
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: { ...found.publicMetadata, role: 'driver' },
      unsafeMetadata: { ...found.unsafeMetadata, role: 'driver' },
    })
  } else {
    tempPassword = generateTempPassword()
    const created = await clerkClient.users.createUser({
      emailAddress: [email],
      firstName,
      lastName: lastName || '',
      password: tempPassword,
      publicMetadata: { role: 'driver' },
      unsafeMetadata: { role: 'driver' },
      privateMetadata: {
        provisionedFrom: 'driver_application',
        referenceNumber: app.reference_number,
        provisionedAt: new Date().toISOString(),
      },
    })
    clerkUserId = created.id
  }

  // ── 2. Supabase users row — LINK, don't duplicate ──────────────────────────
  const supabase = createServerClient()
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const profile = {
    first_name: firstName,
    last_name: lastName || null,
    full_name: app.full_name,
    phone: app.phone,
    role: 'driver',
    is_active: true,
  }

  let userId: string
  if (existingUser?.id) {
    // An earlier admin-created (Clerk-less) row exists — attach the identity to it
    // so the drivers/SOS records that already point at this user_id stay intact.
    userId = existingUser.id
    const { error } = await supabase
      .from('users')
      .update({ ...profile, clerk_user_id: clerkUserId })
      .eq('id', userId)
    if (error) throw new Error(`Failed to link driver user row: ${error.message}`)
  } else {
    const { data: inserted, error } = await supabase
      .from('users')
      .insert({ ...profile, email, clerk_user_id: clerkUserId })
      .select('id')
      .single()
    if (error || !inserted) {
      throw new Error(`Failed to create driver user row: ${error?.message ?? 'no row returned'}`)
    }
    userId = inserted.id
  }

  // ── 3. drivers row (user_id is the PK → upsert is idempotent) ──────────────
  const licenseNumber =
    tryDecrypt(app.license_ciphertext, app.license_iv, app.license_tag) ??
    `****${app.license_last4}`

  const { error: driverError } = await supabase.from('drivers').upsert(
    {
      user_id: userId,
      license_number: licenseNumber,
      license_class: app.license_type,
      license_expiry: app.license_expiry,
      years_experience: app.driving_experience_years,
      vehicle_type: app.vehicle_type,
      vehicle_number: app.vehicle_registration,
    },
    { onConflict: 'user_id' },
  )
  if (driverError) throw new Error(`Failed to create driver record: ${driverError.message}`)

  return { clerkUserId, userId, tempPassword }
}
