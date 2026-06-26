import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { encryptField, last4 } from '@/lib/crypto/fieldEncryption'
import { driverApplicationSubmitSchema } from '@/lib/validation/driverApplication'
import {
  DRIVER_DOCS_BUCKET,
  REQUIRED_DOCUMENT_KEYS,
  finalObjectPath,
  isValidDocumentType,
} from '@/lib/storage/driverDocuments'
import {
  generateReferenceNumber,
  insertApplication,
  type InsertApplicationInput,
} from '@/services/driverApplicationService'
import { sendSubmissionEmails } from '@/lib/email/sendApplicationEmails'
import { isValidReferenceNumber } from '@/lib/referenceNumber'

type Supabase = ReturnType<typeof createServerClient>

/** Returns true if an object exists at `path` (used for retry tolerance). */
async function objectExists(supabase: Supabase, path: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(DRIVER_DOCS_BUCKET).createSignedUrl(path, 60)
  return !error && !!data?.signedUrl
}

/** Move a draft object to its final path; tolerant of an already-moved source (retry). */
async function moveTolerant(supabase: Supabase, from: string, to: string): Promise<void> {
  const { error } = await supabase.storage.from(DRIVER_DOCS_BUCKET).move(from, to)
  if (!error) return
  if (await objectExists(supabase, to)) return // already moved on a prior attempt
  throw new Error(`Failed to move document into place`)
}

/**
 * A draft path is trusted ONLY when it is the exact draft object key this
 * request's own draftId/documentType would produce:
 *   drivers/_drafts/{draftId}/{documentType}/{filename}
 * This binds every client-supplied path to the caller's draftId, so the move
 * step can never be coaxed into relocating an arbitrary bucket object (IDOR /
 * arbitrary storage-object move) such as another applicant's draft or a
 * finalized document.
 */
function isOwnedDraftPath(path: string, draftId: string, documentType: string): boolean {
  const parts = path.split('/')
  // drivers / _drafts / {draftId} / {documentType} / {filename}
  if (parts.length !== 5) return false
  if (parts[0] !== 'drivers' || parts[1] !== '_drafts') return false
  if (parts[2] !== draftId) return false
  if (parts[3] !== documentType) return false
  const fileName = parts[4]
  // No path traversal / empty segment in the filename.
  if (!fileName || fileName === '.' || fileName === '..' || fileName.includes('\\')) return false
  return true
}

// POST /api/drivers/applications  (PUBLIC submit)
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit (5 / IP / hour)
    const ip = getClientIp(request.headers)
    if (!(await checkRateLimit(ip, 'submit', 5, '1 hour'))) {
      return NextResponse.json(
        { error: 'Too many submissions from this network. Please try again later.' },
        { status: 429 },
      )
    }

    // 2. Server-side re-validation (never trust the client)
    const parsed = driverApplicationSubmitSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please fill all mandatory fields', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const input = parsed.data

    // 3. All mandatory documents present?
    const missing = REQUIRED_DOCUMENT_KEYS.filter(
      (k) => !input.documents[k] || input.documents[k].length === 0,
    )
    if (missing.length) {
      return NextResponse.json({ error: 'Please upload all required documents' }, { status: 400 })
    }

    // 4a. Authorize every supplied document path BEFORE minting a reference or
    // touching storage: reject unknown document types and any path not owned by
    // this request's draftId. This closes the arbitrary-storage-object-move IDOR
    // (a client could otherwise pass another applicant's or a finalized object
    // path and have it relocated into its own application prefix).
    for (const [docType, draftPaths] of Object.entries(input.documents)) {
      if (!isValidDocumentType(docType)) {
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
      }
      for (const draftPath of draftPaths) {
        if (!isOwnedDraftPath(draftPath, input.draftId, docType)) {
          return NextResponse.json({ error: 'Invalid document reference' }, { status: 400 })
        }
      }
    }

    // 4b. Mint reference number (atomic per-day sequence)
    const referenceNumber = await generateReferenceNumber()
    if (!isValidReferenceNumber(referenceNumber)) {
      throw new Error('Generated reference number has an unexpected format')
    }
    const supabase = createServerClient()

    // 5. Move uploaded draft files into the reference-numbered prefix.
    // Track moved objects so we can roll them back if the DB insert fails,
    // preventing orphaned (moved-but-unreferenced) storage objects.
    const finalDocuments: Record<string, string[]> = {}
    const movedPairs: Array<{ from: string; to: string }> = []
    for (const [docType, draftPaths] of Object.entries(input.documents)) {
      finalDocuments[docType] = []
      for (const draftPath of draftPaths) {
        const dest = finalObjectPath(referenceNumber, draftPath)
        await moveTolerant(supabase, draftPath, dest)
        movedPairs.push({ from: draftPath, to: dest })
        finalDocuments[docType].push(dest)
      }
    }

    // 6. Encrypt PII (never logged)
    const aadhaar = encryptField(input.aadhaar_number)
    const license = encryptField(input.license_number)

    // 7. Persist (status defaults to 'pending')
    const row: InsertApplicationInput = {
      reference_number: referenceNumber,
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      date_of_birth: input.date_of_birth,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      emergency_contact_name: input.emergency_contact_name,
      emergency_contact_phone: input.emergency_contact_phone,
      aadhaar_ciphertext: aadhaar.ciphertext,
      aadhaar_iv: aadhaar.iv,
      aadhaar_tag: aadhaar.tag,
      aadhaar_last4: last4(input.aadhaar_number),
      vehicle_registration: input.vehicle_registration,
      vehicle_type: input.vehicle_type,
      vehicle_make_model: input.vehicle_make_model ?? null,
      vehicle_year: input.vehicle_year ?? null,
      ambulance_permit_number: input.ambulance_permit_number ?? null,
      license_ciphertext: license.ciphertext,
      license_iv: license.iv,
      license_tag: license.tag,
      license_last4: last4(input.license_number),
      license_expiry: input.license_expiry,
      license_type: input.license_type ?? null,
      driving_experience_years: input.driving_experience_years ?? null,
      previous_ambulance_experience: input.previous_ambulance_experience ?? null,
      document_storage_path: `drivers/${referenceNumber}`,
      documents: finalDocuments,
    }

    let id: string
    try {
      ;({ id } = await insertApplication(row))
    } catch (insertErr) {
      // Insert failed AFTER files were moved out of the draft prefix. Move them
      // back so a retry can re-find them and we don't leave orphaned objects in
      // the reference-numbered prefix.
      for (const { from, to } of movedPairs) {
        try {
          await moveTolerant(supabase, to, from)
        } catch {
          // Best-effort rollback; the retry's moveTolerant tolerates either location.
        }
      }
      throw insertErr
    }

    // 8. Transactional emails (best-effort; MUST never block success — the
    // application is already persisted above, so a failing or mis-configured
    // email provider (e.g. a placeholder RESEND_API_KEY) must never turn a
    // saved submission into a user-facing failure).
    const submittedAt = new Date().toISOString()
    try {
      await sendSubmissionEmails({
        applicationId: id,
        referenceNumber,
        fullName: input.full_name,
        email: input.email,
        phone: input.phone,
        submittedAt,
        summary: {
          vehicleType: input.vehicle_type,
          licenseType: input.license_type,
          experienceYears: input.driving_experience_years ?? null,
        },
      })
    } catch (emailErr) {
      console.error(
        '[applications:submit] email send failed (non-blocking):',
        emailErr instanceof Error ? emailErr.message : 'unknown'
      )
    }

    return NextResponse.json({ reference_number: referenceNumber, id }, { status: 201 })
  } catch (err) {
    // Never log PII; surface a generic message so the client shows the retry screen.
    console.error('[applications:submit] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Submission failed. Please try again.' }, { status: 500 })
  }
}
