'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { getDefaultDashboardPath } from '@/lib/navigation'
import type { UserRole } from '@/types'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded, signUp, setActive } = useSignUp()
  
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  const handleVerification = async () => {
    if (!isLoaded || !signUp) return
    
    setIsLoading(true)
    
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        
        toast.success('Email verified successfully! Welcome to Emergency Response.')
        
        // Redirect based on user role. Use the central route map so we always land
        // on a route that actually exists (e.g. transport_company -> /transport/dashboard,
        // patient -> /mobile-app-required) instead of the non-existent
        // /dashboard/patient and /dashboard/transport-company paths.
        const userRole = completeSignUp.unsafeMetadata?.role as UserRole | undefined
        router.push(getDefaultDashboardPath(userRole ?? null))
      } else {
        console.error('Verification incomplete:', completeSignUp)
        toast.error('Verification incomplete. Please try again.')
      }
    } catch (error: unknown) {
      console.error('Verification error:', error)
      const errorMessage = (error as { errors?: Array<{ message: string }> })?.errors?.[0]?.message || 'Invalid verification code. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return
    
    setIsResending(true)
    
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      toast.success('Verification code sent! Please check your email.')
    } catch (error: unknown) {
      console.error('Resend error:', error)
      toast.error('Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo size="xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="text-gray-600 mt-2">
              We&apos;ve sent a verification code to{' '}
              <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span>Email Verification</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoComplete="one-time-code"
              />
              <p className="text-sm text-gray-500 text-center">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            <Button
              onClick={handleVerification}
              disabled={!code || code.length !== 6 || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Email
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the code?
              </p>
              <Button
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Need help?{' '}
                <a href="/contact" className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Enter the verification code from your email</li>
            <li>• Your account will be activated immediately</li>
            <li>• You&apos;ll be redirected to your dashboard</li>
            <li>• Start using Emergency Response services</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
