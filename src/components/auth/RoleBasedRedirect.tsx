'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { getDefaultDashboardPath } from '@/lib/navigation'

interface RoleBasedRedirectProps {
  children?: React.ReactNode
  fallbackPath?: string
}

export function RoleBasedRedirect({ children, fallbackPath }: RoleBasedRedirectProps) {
  const { role, loading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && role) {
      const dashboardPath = getDefaultDashboardPath(role)
      router.push(dashboardPath)
    } else if (!loading && !role && fallbackPath) {
      router.push(fallbackPath)
    }
  }, [role, loading, router, fallbackPath])

  // Show loading state while determining role
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If children are provided, render them (useful for custom loading states)
  if (children) {
    return <>{children}</>
  }

  return null
}

// Hook for programmatic role-based navigation
export function useRoleBasedNavigation() {
  const { role } = useRole()
  const router = useRouter()

  const navigateToRoleDashboard = () => {
    if (role) {
      const dashboardPath = getDefaultDashboardPath(role)
      router.push(dashboardPath)
    }
  }

  const navigateToRolePage = (pagePath: string) => {
    if (role) {
      let basePath = ''
      switch (role) {
        case 'admin':
          basePath = '/admin'
          break
        case 'ert':
          basePath = '/erteam'
          break
        case 'transport_company':
          basePath = '/transport'
          break
      }
      router.push(`${basePath}${pagePath}`)
    }
  }

  return {
    navigateToRoleDashboard,
    navigateToRolePage,
    currentRole: role
  }
}
