'use client'

import { useState, useEffect, useCallback } from 'react'
import { Announcement, CreateAnnouncementInput, UpdateAnnouncementInput } from '@/services/announcementService'

interface UseAnnouncementsOptions {
  limit?: number
  offset?: number
}

export function useAnnouncements(options: UseAnnouncementsOptions = {}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset !== undefined) params.append('offset', options.offset.toString())

      const response = await fetch(`/api/announcements?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch announcements')
      const data = await response.json()
      setAnnouncements(data.announcements || [])
      setCount(data.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.limit, options.offset])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  return { announcements, loading, error, count, refetch: fetchAnnouncements }
}

export function useActiveAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/announcements/active')
      if (!response.ok) throw new Error('Failed to fetch announcements')
      const data = await response.json()
      setAnnouncements(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActiveAnnouncements()
  }, [fetchActiveAnnouncements])

  return { announcements, loading, error, refetch: fetchActiveAnnouncements }
}

export function useAnnouncement(id: string) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/announcements/${id}`)
        if (!response.ok) throw new Error('Failed to fetch announcement')
        const data = await response.json()
        setAnnouncement(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    if (id) fetchAnnouncement()
  }, [id])

  return { announcement, loading, error }
}

export function useCreateAnnouncement() {
  const [loading, setLoading] = useState(false)

  const createAnnouncement = async (input: CreateAnnouncementInput): Promise<Announcement | null> => {
    try {
      setLoading(true)
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error('Failed to create announcement')
      return await response.json()
    } catch (err) {
      console.error('Error creating announcement:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createAnnouncement, loading }
}

export function useUpdateAnnouncement() {
  const [loading, setLoading] = useState(false)

  const updateAnnouncement = async (id: string, input: UpdateAnnouncementInput): Promise<Announcement | null> => {
    try {
      setLoading(true)
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error('Failed to update announcement')
      return await response.json()
    } catch (err) {
      console.error('Error updating announcement:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateAnnouncement, loading }
}

export function useDeleteAnnouncement() {
  const [loading, setLoading] = useState(false)

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      return response.ok
    } catch (err) {
      console.error('Error deleting announcement:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteAnnouncement, loading }
}

