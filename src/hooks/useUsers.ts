import { useState, useEffect, useCallback } from 'react'
import { DatabaseUser } from '@/lib/supabase'

// Hook for fetching multiple users
export function useUsers(filters?: {
  role?: string
  transport_company_id?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const [users, setUsers] = useState<DatabaseUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters?.role) params.append('role', filters.role)
      if (filters?.transport_company_id) params.append('transport_company_id', filters.transport_company_id)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`/api/users?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users || [])
      setCount(data.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
      setUsers([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [filters?.role, filters?.transport_company_id, filters?.search, filters?.limit, filters?.offset])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, count, refetch: fetchUsers }
}

// Hook for fetching a single user
export function useUser(id: string | null) {
  const [user, setUser] = useState<DatabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    if (!id) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user')
      }

      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, error, refetch: fetchUser }
}

// Hook for creating a user
export function useCreateUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createUser = useCallback(async (userData: {
    clerk_user_id: string
    full_name: string
    email: string
    role: 'admin' | 'ert' | 'transport_company' | 'driver' | 'patient'
    transport_company_id?: string
  }): Promise<DatabaseUser | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      return data.user
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createUser, loading, error }
}

// Hook for updating a user
export function useUpdateUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateUser = useCallback(async (id: string, userData: Partial<{
    full_name: string
    email: string
    role: 'admin' | 'ert' | 'transport_company' | 'driver' | 'patient'
    transport_company_id: string
  }>): Promise<DatabaseUser | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      return data.user
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateUser, loading, error }
}

// Hook for deleting a user
export function useDeleteUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteUser, loading, error }
}

// Hook for fetching users by role (useful for patient forms)
export function useUsersByRole(role: 'admin' | 'ert' | 'transport_company' | 'driver' | 'patient') {
  const [users, setUsers] = useState<DatabaseUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsersByRole = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users?role=${role}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchUsersByRole()
  }, [fetchUsersByRole])

  return { users, loading, error, refetch: fetchUsersByRole }
}
