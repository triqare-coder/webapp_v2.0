'use client'

import { useState, useEffect, useMemo } from 'react'
import { SOSService } from '@/services/sosService'

export interface ERTDriverWithStatus {
  id: string
  user_id: string
  transport_company_id: string
  license_number: string
  aadhar_number?: string
  is_verified: boolean
  driver_status: 'available' | 'assigned' | 'on_trip' | 'inactive'
  current_request_id?: string
  latitude?: number
  longitude?: number
  last_updated_at: string
  address_line?: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string

  // User information
  full_name: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  employee_id?: string
  created_at: string
  is_active: boolean
  last_sign_in_at?: string

  // Transport company info
  transport_company?: {
    user_id: string
    company_name: string
    registration_number?: string
    is_verified: boolean
  }

  // Location info
  country?: { id: string; name: string }
  state?: { id: string; name: string }
  city?: { id: string; name: string }

  // Calculated status for ERT view
  status: 'online' | 'offline' | 'busy'
  current_assignment?: {
    id: string
    status: string
    requested_at: string
  } | null
  assigned_at?: string | null
}

export interface ERTDriverFilters {
  search?: string
  status?: 'all' | 'online' | 'offline' | 'busy'
  shift?: 'all' | 'day' | 'night' | 'rotating'
  country_id?: string
  state_id?: string
  city_id?: string
}

export interface ERTDriverStats {
  total: number
  online: number
  offline: number
  busy: number
  avgRating: number
}

export function useERTDrivers(filters: ERTDriverFilters = {}) {
  const [drivers, setDrivers] = useState<ERTDriverWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await SOSService.getAllDriversWithStatus()
      
      if (fetchError) {
        setError(fetchError)
        return
      }
      
      setDrivers(data || [])
    } catch (err) {
      console.error('Error fetching drivers:', err)
      setError('Failed to fetch drivers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  // Filter drivers based on search and status
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          driver.full_name?.toLowerCase().includes(searchTerm) ||
          driver.employee_id?.toLowerCase().includes(searchTerm) ||
          driver.email?.toLowerCase().includes(searchTerm) ||
          driver.phone?.toLowerCase().includes(searchTerm) ||
          driver.license_number?.toLowerCase().includes(searchTerm) ||
          driver.transport_company?.company_name?.toLowerCase().includes(searchTerm)

        if (!matchesSearch) return false
      }

      // Status filter
      if (filters.status && filters.status !== 'all') {
        if (driver.status !== filters.status) return false
      }

      // Shift filter - for now we'll skip this since drivers table doesn't have shift info
      // This could be added later if shift information is stored somewhere
      if (filters.shift && filters.shift !== 'all') {
        // Skip shift filtering for now as it's not in the drivers table
        // Could be implemented later with additional data
      }

      // Location filters
      if (filters.country_id) {
        if (driver.country_id !== filters.country_id) return false
      }

      if (filters.state_id) {
        if (driver.state_id !== filters.state_id) return false
      }

      if (filters.city_id) {
        if (driver.city_id !== filters.city_id) return false
      }

      return true
    })
  }, [drivers, filters])

  // Calculate statistics
  const stats = useMemo((): ERTDriverStats => {
    const total = drivers.length
    const online = drivers.filter(d => d.status === 'online').length
    const offline = drivers.filter(d => d.status === 'offline').length
    const busy = drivers.filter(d => d.status === 'busy').length

    // For now, we'll set avgRating to 0 since rating info isn't in drivers table
    // This could be enhanced later by joining with additional rating data
    const avgRating = 0

    return {
      total,
      online,
      offline,
      busy,
      avgRating
    }
  }, [drivers])

  return {
    drivers: filteredDrivers,
    allDrivers: drivers,
    loading,
    error,
    stats,
    refetch: fetchDrivers
  }
}

// Helper hooks for styling
export function useERTStatusColor(status: string) {
  switch (status) {
    case 'online':
      return 'bg-green-100 text-green-800'
    case 'busy':
      return 'bg-red-100 text-red-800'
    case 'offline':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function useERTShiftColor(shift: string) {
  switch (shift?.toLowerCase()) {
    case 'day':
      return 'bg-blue-100 text-blue-800'
    case 'night':
      return 'bg-purple-100 text-purple-800'
    case 'rotating':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Helper function to get status icon
export function getERTStatusIcon(status: string) {
  switch (status) {
    case 'online':
      return '🟢'
    case 'busy':
      return '🔴'
    case 'offline':
      return '⚫'
    default:
      return '⚫'
  }
}

// Helper function to format certifications (not available in drivers table)
export function formatCertifications(certifications?: string): string[] {
  if (!certifications) return []
  return certifications.split(',').map(cert => cert.trim()).filter(cert => cert.length > 0)
}

// Helper function to calculate hours worked based on last update
export function calculateHoursWorked(lastUpdated?: string): number {
  if (!lastUpdated) return 0
  const lastUpdateDate = new Date(lastUpdated)
  const now = new Date()
  const diffHours = Math.abs(now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60)
  return Math.min(Math.round(diffHours * 10) / 10, 12) // Cap at 12 hours
}

// Helper function to get shift times (generic since shift info not in drivers table)
export function getShiftTimes(shift?: string): { start: string; end: string } {
  // Default shift times since shift info isn't stored in drivers table
  return { start: '08:00', end: '17:00' }
}

// Helper function to format driver location
export function formatDriverLocation(driver: ERTDriverWithStatus): string {
  if (driver.address_line) {
    return driver.address_line
  }
  if (driver.latitude && driver.longitude) {
    return `${driver.latitude.toFixed(4)}, ${driver.longitude.toFixed(4)}`
  }
  return 'Location not available'
}

// Helper function to get driver company name
export function getDriverCompany(driver: ERTDriverWithStatus): string {
  return driver.transport_company?.company_name || 'No company assigned'
}
