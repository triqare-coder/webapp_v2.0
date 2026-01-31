import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserRole } from '@/types'

export interface CurrentUser {
  id: string
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  phone?: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCurrentUser() {
      if (!isClerkLoaded) return
      
      if (!clerkUser) {
        setCurrentUser(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const { data, error: supabaseError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_user_id', clerkUser.id)
          .single()

        if (supabaseError) {
          if (supabaseError.code === 'PGRST116') {
            // User not found in database, this might be a new user
            setError('User not found in database. Please complete your registration.')
          } else {
            setError(supabaseError.message)
          }
          setCurrentUser(null)
        } else {
          setCurrentUser({
            id: data.id,
            clerkUserId: data.clerk_user_id,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            fullName: data.full_name,
            phone: data.phone,
            role: data.role as UserRole,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          })
        }
      } catch (err: unknown) {
        console.error('Error fetching current user:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data'
        setError(errorMessage)
        setCurrentUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [clerkUser, isClerkLoaded])

  return {
    user: currentUser,
    isLoading: isLoading || !isClerkLoaded,
    error,
    refetch: () => {
      if (clerkUser) {
        setIsLoading(true)
        // Re-trigger the effect by updating a dependency
      }
    }
  }
}

// Helper hook to check if user has specific role
export function useUserRole(requiredRole: UserRole) {
  const { user, isLoading, error } = useCurrentUser()
  
  return {
    hasRole: user?.role === requiredRole,
    user,
    isLoading,
    error
  }
}

// Helper hook to check if user has any of the specified roles
export function useUserRoles(requiredRoles: UserRole[]) {
  const { user, isLoading, error } = useCurrentUser()
  
  return {
    hasRole: user ? requiredRoles.includes(user.role) : false,
    user,
    isLoading,
    error
  }
}
