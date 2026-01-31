'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function TestSOSPage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [testingAssignment, setTestingAssignment] = useState(false)
  const [assignmentResults, setAssignmentResults] = useState<any>(null)

  const testSOSCreation = async () => {
    setTesting(true)
    setResults(null)

    try {
      const response = await fetch('/api/debug/test-sos-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      setResults(result)

      if (result.success) {
        toast.success('SOS creation test passed!')
      } else {
        toast.error('SOS creation test failed')
      }
    } catch (error) {
      console.error('Test error:', error)
      setResults({
        success: false,
        error: 'Network error or server unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      toast.error('Test failed due to network error')
    } finally {
      setTesting(false)
    }
  }

  const testDriverAssignment = async () => {
    setTestingAssignment(true)
    setAssignmentResults(null)

    try {
      const response = await fetch('/api/debug/test-driver-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      setAssignmentResults(result)

      if (result.success) {
        toast.success('Driver assignment test passed!')
      } else {
        toast.error('Driver assignment test failed')
      }
    } catch (error) {
      console.error('Driver assignment test error:', error)
      setAssignmentResults({
        success: false,
        error: 'Network error or server unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      toast.error('Driver assignment test failed due to network error')
    } finally {
      setTestingAssignment(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 SOS Creation Test Page
        </h1>
        <p className="text-gray-600">
          Test if SOS requests can be created successfully
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            SOS Creation Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            This test will attempt to create a SOS request using a random patient from the database.
            It will help identify any RLS policy issues or other database problems.
          </div>

          <Button 
            onClick={testSOSCreation}
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testing SOS Creation...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run SOS Creation Test
              </>
            )}
          </Button>

          {results && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                {results.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700">Test Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700">Test Failed</span>
                  </>
                )}
              </div>

              {results.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">✅ Success!</h3>
                  <p className="text-green-700 text-sm mb-3">{results.message}</p>
                  
                  {results.sosRequest && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>SOS Request Created:</strong>
                        <div className="ml-4 mt-1 space-y-1">
                          <div>ID: <Badge variant="outline">{results.sosRequest.id.slice(0, 8)}...</Badge></div>
                          <div>Status: <Badge>{results.sosRequest.status}</Badge></div>
                          <div>Patient: {results.testPatient?.full_name || results.testPatient?.email}</div>
                          <div>Created: {new Date(results.sosRequest.requested_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">❌ Error Details</h3>
                  <p className="text-red-700 text-sm mb-3">{results.error}</p>
                  
                  {results.details && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Technical Details:</strong>
                        <div className="ml-4 mt-1 space-y-1">
                          {results.errorCode && <div>Error Code: <Badge variant="destructive">{results.errorCode}</Badge></div>}
                          {results.errorMessage && <div>Message: {results.errorMessage}</div>}
                          {results.testPatient && (
                            <div>Test Patient: {results.testPatient.full_name || results.testPatient.email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {results.errorCode === '42501' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <h4 className="font-medium text-yellow-800 mb-2">🔒 RLS Policy Issue Detected</h4>
                      <p className="text-yellow-700 text-sm mb-2">
                        The sos_requests table has Row Level Security enabled but no policies allow insertion.
                      </p>
                      <p className="text-yellow-700 text-sm">
                        <strong>Fix:</strong> Run this SQL command in Supabase SQL Editor:
                      </p>
                      <code className="block mt-2 p-2 bg-gray-100 text-sm rounded">
                        ALTER TABLE public.sos_requests DISABLE ROW LEVEL SECURITY;
                      </code>
                    </div>
                  )}

                  {results.errorCode === '23503' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <h4 className="font-medium text-red-800 mb-2">🔗 Foreign Key Constraint Issue</h4>
                      <p className="text-red-700 text-sm mb-2">
                        The sos_requests table foreign keys are pointing to auth.users instead of public.users.
                      </p>
                      <p className="text-red-700 text-sm mb-2">
                        <strong>Fix:</strong> Run these SQL commands in Supabase SQL Editor:
                      </p>
                      <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                        <div>-- Drop existing constraints</div>
                        <div>ALTER TABLE public.sos_requests DROP CONSTRAINT IF EXISTS sos_requests_patient_id_fkey;</div>
                        <div>ALTER TABLE public.sos_requests DROP CONSTRAINT IF EXISTS sos_requests_driver_id_fkey;</div>
                        <div className="mt-2">-- Add correct constraints</div>
                        <div>ALTER TABLE public.sos_requests ADD CONSTRAINT sos_requests_patient_id_fkey</div>
                        <div>FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;</div>
                        <div>ALTER TABLE public.sos_requests ADD CONSTRAINT sos_requests_driver_id_fkey</div>
                        <div>FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Driver Assignment Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            This test will attempt to assign a driver to a SOS request.
            It will help identify foreign key constraint issues with driver assignments.
          </div>

          <Button
            onClick={testDriverAssignment}
            disabled={testingAssignment}
            className="w-full"
            variant="outline"
          >
            {testingAssignment ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Testing Driver Assignment...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Driver Assignment Test
              </>
            )}
          </Button>

          {assignmentResults && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                {assignmentResults.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700">Test Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700">Test Failed</span>
                  </>
                )}
              </div>

              {assignmentResults.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">✅ Success!</h3>
                  <p className="text-green-700 text-sm mb-3">{assignmentResults.message}</p>

                  {assignmentResults.results && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Test Details:</strong>
                        <div className="ml-4 mt-1 space-y-1">
                          <div>Available Drivers: <Badge variant="outline">{assignmentResults.results.driversAvailable}</Badge></div>
                          <div>Test Driver: {assignmentResults.results.testDriver?.name} ({assignmentResults.results.testDriver?.email})</div>
                          <div>Test SOS: <Badge variant="outline">{assignmentResults.results.testSOS?.id.slice(0, 8)}...</Badge></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">❌ Error Details</h3>
                  <p className="text-red-700 text-sm mb-3">{assignmentResults.error}</p>

                  {assignmentResults.results?.assignmentResult && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Assignment Error:</strong>
                        <div className="ml-4 mt-1 space-y-1">
                          <div className="text-red-600">{assignmentResults.results.assignmentResult.error}</div>
                          {assignmentResults.results.testDriver && (
                            <div>Test Driver: {assignmentResults.results.testDriver.name} ({assignmentResults.results.testDriver.email})</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Fix Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            If the test fails with RLS policy errors, follow these steps:
          </div>
          
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium">Step 1: Open Supabase SQL Editor</h4>
              <p className="text-sm text-gray-600">Go to your Supabase project dashboard and navigate to SQL Editor</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium">Step 2: Run Fix Command</h4>
              <code className="block mt-1 p-2 bg-gray-100 text-sm rounded">
                ALTER TABLE public.sos_requests DISABLE ROW LEVEL SECURITY;
              </code>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium">Step 3: Test Again</h4>
              <p className="text-sm text-gray-600">Come back to this page and run the test again</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
