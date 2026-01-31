'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const createInitialUser = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/create-initial-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to create initial user' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Initial Admin User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Click the button below to create the initial admin user in the database.
          </p>
          
          <Button 
            onClick={createInitialUser} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Initial Admin User'}
          </Button>
          
          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
