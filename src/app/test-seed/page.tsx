'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestSeedPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const seedData = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/locations/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to seed data')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seed Location Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={seedData} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Seeding Data...' : 'Seed Sample Location Data'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-semibold">{result.message}</p>
              <div className="mt-2 text-sm text-green-700">
                <p>Countries created: {result.results.countries}</p>
                <p>States created: {result.results.states}</p>
                <p>Cities created: {result.results.cities}</p>
                <p>Pincodes created: {result.results.pincodes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
