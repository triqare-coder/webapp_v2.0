import { DatabaseUser } from '@/lib/supabase'

/**
 * Safely gets a user's display name with fallbacks
 * @param user - The user object from the database
 * @returns A non-empty display name
 */
export function getUserDisplayName(user: DatabaseUser): string {
  // First try full_name
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.trim()
  }
  
  // Fallback to first_name + last_name
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  }
  
  // Final fallback to email username
  return user.email.split('@')[0]
}

/**
 * Safely gets user initials with fallbacks
 * @param user - The user object from the database
 * @returns User initials (max 2 characters)
 */
export function getUserInitials(user: DatabaseUser): string {
  const displayName = getUserDisplayName(user)
  
  // Split by space and get first letter of each word, max 2 letters
  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
  
  // If no initials or empty, use first 2 letters of display name
  return initials || displayName.substring(0, 2).toUpperCase()
}

/**
 * Safely gets a hospital or organization name initials
 * @param name - The name string
 * @returns Initials (max 2 characters) or fallback
 */
export function getNameInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) {
    return 'N/A'
  }
  
  // Split by space and get first letter of each word, max 2 letters
  const initials = name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
  
  // If no initials, use first 2 letters of name
  return initials || name.substring(0, 2).toUpperCase()
}

/**
 * Creates a fallback full name from first and last name or email
 * @param firstName - First name (can be null/undefined)
 * @param lastName - Last name (can be null/undefined)
 * @param email - Email address as fallback
 * @returns A non-empty full name
 */
export function createFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string
): string {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  
  if (fullName) {
    return fullName
  }
  
  // Use individual names if available
  if (firstName && firstName.trim()) {
    return firstName.trim()
  }
  
  if (lastName && lastName.trim()) {
    return lastName.trim()
  }
  
  // Final fallback to email username
  return email.split('@')[0]
}
