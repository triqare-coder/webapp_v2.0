import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  // Format as +X-XXX-XXX-XXXX for international numbers
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  return phone
}

export function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'critical':
      return 'bg-[#f5cccc] text-[#cc3333] border border-[#cc3333]/30 font-semibold'
    default:
      return 'bg-[#e6e6e6] text-[#666666] border border-[#d1d5db]'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'available':
    case 'completed':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'assigned':
    case 'on_duty':
    case 'dispatched':
      return 'bg-[#ccd9e6] text-[#003366] border border-[#003366]/30 font-medium'
    case 'en_route':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'pending':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'cancelled':
    case 'off_duty':
    case 'maintenance':
    case 'out_of_service':
      return 'bg-[#f5cccc] text-[#cc3333] border border-[#cc3333]/30'
    default:
      return 'bg-[#e6e6e6] text-[#666666] border border-[#d1d5db]'
  }
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}
