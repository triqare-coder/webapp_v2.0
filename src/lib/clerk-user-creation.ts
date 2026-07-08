import { clerkClient } from '@clerk/nextjs/server'

/**
 * Create a user directly in Clerk with a temporary password
 * User can reset their password later to login
 *
 * NOTE: the phone number is intentionally NOT sent to Clerk. Phone is not a
 * login method for these accounts (users sign in by email + password reset),
 * and Clerk rejects phone numbers whose country code is not enabled on the
 * instance ("Unsupported country code"), which used to fail the whole import.
 * The phone is persisted in Supabase by the caller instead. The `phone`
 * parameter is kept for backward-compatibility with existing callers.
 *
 * @param email - User's email address
 * @param fullName - User's full name
 * @param role - User's role (driver, patient, transport_company, etc.)
 * @param _phone - Optional phone number (persisted in Supabase by the caller, not Clerk)
 * @returns Object with success status, clerkUserId, and error if any
 */
export async function createClerkUser(
  email: string,
  fullName: string,
  role: string,
  _phone?: string
): Promise<{ success: boolean; clerkUserId?: string; error?: string }> {
  try {
    const client = await clerkClient()

    // Generate a temporary random password (user will reset it later)
    const temporaryPassword = generateTemporaryPassword()

    console.log(`Creating Clerk user: ${email} (role: ${role})`)

    // Build user creation payload. Phone is deliberately omitted — see the note
    // on this function.
    const userPayload: any = {
      emailAddress: [email],
      password: temporaryPassword,
      firstName: fullName.split(' ')[0] || fullName,
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      publicMetadata: {
        role: role
      },
      skipPasswordChecks: true, // Skip password strength requirements for temporary password
      skipPasswordRequirement: false // We ARE providing a password
    }

    // Create user in Clerk
    const user = await client.users.createUser(userPayload)

    return {
      success: true,
      clerkUserId: user.id
    }
  } catch (error: any) {
    console.error(`Error creating Clerk user ${email}:`, error)
    console.error('Error details:', JSON.stringify(error, null, 2))

    // Handle specific error cases
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((e: any) => e.message).join(', ')
      return {
        success: false,
        error: errorMessages
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to create user in Clerk'
    }
  }
}

/**
 * Generate a secure temporary password
 * User will reset this via "Forgot Password" flow
 */
function generateTemporaryPassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one of each type
  password += 'A' // Uppercase
  password += 'a' // Lowercase
  password += '1' // Number
  password += '!' // Special char
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

