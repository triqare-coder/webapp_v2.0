import { useUser } from '@clerk/nextjs'
import { UserRole } from '@/types'

export function useRole(): {
  role: UserRole | null
  isAdmin: boolean
  isERT: boolean
  isTransportCompany: boolean
  isPatient: boolean
  isDriver: boolean
  loading: boolean
  updateRole: (newRole: UserRole) => Promise<void>
} {
  const { user, isLoaded } = useUser()

  // Get role from Clerk user metadata
  const getRole = (): UserRole | null => {
    if (!user) return null

    // Check public metadata first (set by admin)
    const publicRole = user.publicMetadata?.role as UserRole
    if (publicRole && ['admin', 'ert', 'transport_company', 'patient', 'driver'].includes(publicRole)) {
      return publicRole
    }

    // Check unsafe metadata (set by user or system)
    const privateRole = user.unsafeMetadata?.role as UserRole
    if (privateRole && ['admin', 'ert', 'transport_company', 'patient', 'driver'].includes(privateRole)) {
      return privateRole
    }

    // Fallback: check email patterns for demo/development
    const email = user.primaryEmailAddress?.emailAddress
    if (email) {
      if (email.includes('admin')) return 'admin'
      if (email.includes('ert')) return 'ert'
      if (email.includes('transport')) return 'transport_company'
      if (email.includes('patient')) return 'patient'
      if (email.includes('driver')) return 'driver'
    }

    // Default role for new users (can be changed by admin)
    return 'patient'
  }

  const role = isLoaded ? getRole() : null

  // Function to update user role (admin only)
  const updateRole = async (newRole: UserRole): Promise<void> => {
    if (!user) throw new Error('No user found')

    try {
      // Use the API endpoint to update user role
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to update role: ${error}`)
      }

      // Reload the user to get updated metadata
      await user.reload()
    } catch (error) {
      console.error('Failed to update user role:', error)
      throw error
    }
  }

  return {
    role,
    isAdmin: role === 'admin',
    isERT: role === 'ert',
    isTransportCompany: role === 'transport_company',
    isPatient: role === 'patient',
    isDriver: role === 'driver',
    loading: !isLoaded,
    updateRole
  }
}
