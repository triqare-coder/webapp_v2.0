'use client'

import { useState } from 'react'
import { MobileAppRedirect } from '@/components/auth/MobileAppRedirect'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types'

export default function TestMobileRedirectPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  if (selectedRole === 'patient' || selectedRole === 'driver') {
    return <MobileAppRedirect role={selectedRole} userName="Test User" />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Test Mobile App Redirect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            Select a role to test the mobile app redirect:
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setSelectedRole('patient')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Test Patient Role
            </Button>
            
            <Button 
              onClick={() => setSelectedRole('driver')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Test Driver Role
            </Button>
            
            <Button 
              onClick={() => setSelectedRole('admin')}
              className="w-full bg-gray-600 hover:bg-gray-700"
            >
              Test Admin Role (should not redirect)
            </Button>
          </div>
          
          {selectedRole && !['patient', 'driver'].includes(selectedRole) && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>{selectedRole}</strong> role would be redirected to their appropriate dashboard, not the mobile app page.
              </p>
              <Button 
                onClick={() => setSelectedRole(null)}
                variant="outline"
                className="mt-2 w-full"
              >
                Reset Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
