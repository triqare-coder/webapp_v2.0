import { clerkClient } from '@clerk/nextjs/server'

/**
 * Validate and format phone number for Clerk
 * Clerk requires phone numbers in international format with country code
 *
 * @param phone - Phone number to validate
 * @returns Formatted phone number or null if invalid
 */
function validatePhoneNumber(phone?: string): string | null {
  if (!phone || phone.trim() === '') return null

  try {
    // Remove all whitespace and special characters except + and digits
    let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '')

    // If it doesn't start with +, assume it's an Indian number and add +91
    if (!cleaned.startsWith('+')) {
      // Remove leading 0 if present (common in Indian numbers)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1)
      }

      // Only process if it's exactly 10 digits (valid Indian mobile number)
      if (/^\d{10}$/.test(cleaned)) {
        cleaned = '+91' + cleaned
      } else {
        // Invalid format, skip phone number
        console.warn(`Skipping invalid phone number format: ${phone}`)
        return null
      }
    }

    // Validate the final format: should be + followed by 10-15 digits
    if (!/^\+\d{10,15}$/.test(cleaned)) {
      console.warn(`Skipping phone number with invalid international format: ${phone}`)
      return null
    }

    return cleaned
  } catch (error) {
    console.error(`Error validating phone number ${phone}:`, error)
    return null
  }
}

/**
 * Create a user directly in Clerk with a temporary password
 * User can reset their password later to login
 *
 * @param email - User's email address
 * @param fullName - User's full name
 * @param role - User's role (driver, patient, transport_company, etc.)
 * @param phone - Optional phone number (will be formatted to international format)
 * @returns Object with success status, clerkUserId, and error if any
 */
export async function createClerkUser(
  email: string,
  fullName: string,
  role: string,
  phone?: string
): Promise<{ success: boolean; clerkUserId?: string; error?: string }> {
  try {
    const client = await clerkClient()

    // Generate a temporary random password (user will reset it later)
    const temporaryPassword = generateTemporaryPassword()

    // Validate and format phone number
    const formattedPhone = validatePhoneNumber(phone)

    // Log what we're sending to Clerk for debugging
    console.log(`Creating Clerk user: ${email}, phone: ${phone} -> ${formattedPhone || 'skipped'}`)

    // Build user creation payload
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

    // Only add phone number if it's valid
    if (formattedPhone) {
      userPayload.phoneNumber = [formattedPhone]
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

