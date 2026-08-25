'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { getBrowserSupabase } from '@/lib/supabase/browser'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { HospitalProvider } from '@/components/hospital/HospitalContext'
import { HospitalTopNav } from '@/components/hospital/HospitalTopNav'
import { SosBeacon } from '@/components/hospital/SosBeacon'

/** Paths inside /hospital that must render without a session (US-001 first login). */
const PUBLIC_PATHS = ['/hospital/set-password', '/hospital/link-expired']

function HospitalShell({ children }: { children: ReactNode }) {
  const { authUser, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!authUser) {
      router.replace('/sign-in?redirect_url=/hospital')
      return
    }
    // A signed-in user of another role landing here is sent to their own
    // dashboard rather than shown an empty hospital shell.
    if (role && role !== 'hospital') router.replace('/dashboard')
  }, [authUser, role, loading, router])

  // 8-hour inactivity timeout with re-authentication. Without it a dashboard
  // left open on a ward terminal stays signed in indefinitely.
  useIdleTimeout(async () => {
    await getBrowserSupabase().auth.signOut()
    router.replace('/sign-in?timeout=1')
  })

  if (loading || !authUser || (role && role !== 'hospital')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <p className="text-sm text-neutral-500">Loading your dashboard…</p>
      </div>
    )
  }

  return (
    <HospitalProvider>
      <div className="min-h-screen bg-[#f5f7fa]">
        <HospitalTopNav />
        {/* Rendered at the shell so an incoming SOS overrides whatever page is open. */}
        <SosBeacon />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </HospitalProvider>
  )
}

export default function HospitalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // The onboarding pages live under /hospital but by definition have no session
  // yet, so they must not be wrapped in the authenticated shell.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>

  return <HospitalShell>{children}</HospitalShell>
}
