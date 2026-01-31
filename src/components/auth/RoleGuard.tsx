'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
  showError?: boolean
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallbackPath = '/dashboard',
  showError = true 
}: RoleGuardProps) {
  const { role, loading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && role && !allowedRoles.includes(role)) {
      if (!showError) {
        router.push(fallbackPath)
      }
    }
  }, [role, loading, allowedRoles, router, fallbackPath, showError])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show unauthorized access error
  if (!role || !allowedRoles.includes(role)) {
    if (!showError) {
      return null
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Insufficient Permissions</span>
            </div>
            <p className="text-gray-600">
              You don't have permission to access this page. This area is restricted to:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <ul className="text-sm text-gray-700 space-y-1">
                {allowedRoles.map((allowedRole) => (
                  <li key={allowedRole} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="capitalize">
                      {allowedRole === 'ert' ? 'Emergency Response Team' : 
                       allowedRole === 'transport_company' ? 'Transport Company' : 
                       allowedRole}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4">
              <Button 
                onClick={() => router.push(fallbackPath)}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for page-level protection
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  options?: {
    fallbackPath?: string
    showError?: boolean
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <RoleGuard 
        allowedRoles={allowedRoles}
        fallbackPath={options?.fallbackPath}
        showError={options?.showError}
      >
        <Component {...props} />
      </RoleGuard>
    )
  }
}

// Utility component for conditional rendering based on role
interface RoleBasedRenderProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleBasedRender({ allowedRoles, children, fallback = null }: RoleBasedRenderProps) {
  const { role, loading } = useRole()

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
  }

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
