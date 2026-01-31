'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRole } from '@/hooks/useRole'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function DebugUserPage() {
  const { user, isLoaded } = useUser()
  const { role, loading, updateRole } = useRole()
  const router = useRouter()

  const handleSetRole = async (newRole: 'admin' | 'ert' | 'transport_company') => {
    try {
      await updateRole(newRole)
      alert(`Role set to ${newRole}! Redirecting...`)
      router.push('/dashboard')
    } catch (error) {
      alert('Failed to set role: ' + error)
    }
  }

  if (loading || !isLoaded) {
    return <div className="p-8">Loading...</div>
  }

  if (!user) {
    return (
      <div className="p-8">
        <p>Not signed in. <a href="/sign-in" className="text-blue-600">Sign in here</a></p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔍 User Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Info:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
                  <p><strong>First Name:</strong> {user.firstName || 'Not set'}</p>
                  <p><strong>Last Name:</strong> {user.lastName || 'Not set'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Role Info:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Current Role:</strong> {role || 'None'}</p>
                  <p><strong>Public Metadata Role:</strong> {user.publicMetadata?.role as string || 'None'}</p>
                  <p><strong>Private Metadata Role:</strong> {'None'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Email Pattern Check:</h3>
              <div className="space-y-1 text-sm">
                <p>Contains 'admin': {user.primaryEmailAddress?.emailAddress?.includes('admin') ? '✅ Yes' : '❌ No'}</p>
                <p>Contains 'ert': {user.primaryEmailAddress?.emailAddress?.includes('ert') ? '✅ Yes' : '❌ No'}</p>
                <p>Contains 'transport': {user.primaryEmailAddress?.emailAddress?.includes('transport') ? '✅ Yes' : '❌ No'}</p>
                <p>Contains 'patient': {user.primaryEmailAddress?.emailAddress?.includes('patient') ? '✅ Yes' : '❌ No'}</p>
                <p>Contains 'driver': {user.primaryEmailAddress?.emailAddress?.includes('driver') ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Full Metadata:</h3>
              <div className="bg-gray-100 p-3 rounded text-xs">
                <p><strong>Public Metadata:</strong></p>
                <pre>{JSON.stringify(user.publicMetadata, null, 2)}</pre>
                <p className="mt-2"><strong>Private Metadata:</strong></p>
                <pre>{JSON.stringify({}, null, 2)}</pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🛠️ Quick Role Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                If your role isn't being detected automatically, you can manually assign one:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => handleSetRole('admin')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Set as Admin
                </Button>
                <Button 
                  onClick={() => handleSetRole('ert')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Set as ERT
                </Button>
                <Button 
                  onClick={() => handleSetRole('transport_company')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Set as Transport
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🚀 Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
              <Button onClick={() => router.push('/admin/users/assign-roles')} variant="outline">
                Role Assignment (Admin)
              </Button>
              <Button onClick={() => router.push('/')} variant="outline">
                Go Home
              </Button>
              <SignOutButton>
                <Button variant="outline" className="flex items-center space-x-2">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </SignOutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
