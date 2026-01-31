'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugProfilePage() {
  const { user, isLoaded } = useUser()
  const [profileData, setProfileData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const testProfileAPI = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      console.log('Testing profile API with user:', user.id)
      
      const response = await fetch('/api/profile')
      const data = await response.json()

      if (response.ok) {
        console.log('Profile API success:', data)
        setProfileData(data)
      } else {
        console.error('Profile API error:', data)
        setError(data.error || 'Failed to fetch profile')
      }
    } catch (err) {
      console.error('Profile API exception:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && user) {
      testProfileAPI()
    }
  }, [isLoaded, user])

  if (!isLoaded) {
    return <div className="p-6">Loading Clerk...</div>
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Debug Profile - Not Authenticated</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to test the profile functionality.</p>
            <a href="/sign-in" className="text-blue-600 hover:underline">
              Sign In
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Profile Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Clerk User Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify({
                id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">Quick Role Links:</h3>
            <div className="flex gap-2 flex-wrap">
              <a href="/admin/profile" className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                Admin Profile
              </a>
              <a href="/erteam/profile" className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                ERT Profile
              </a>
              <a href="/transport/profile" className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600">
                Transport Profile
              </a>
              <a href="/driver/profile" className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600">
                Driver Profile
              </a>
              <a href="/patient/profile" className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                Patient Profile
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Profile API Test:</h3>
            <button 
              onClick={testProfileAPI}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Profile API'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {profileData && (
            <div>
              <h3 className="font-semibold">Profile API Response:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
