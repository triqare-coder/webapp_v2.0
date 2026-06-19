import type { Metadata } from 'next'
import { SiteHeader } from '@/components/public/SiteHeader'
import { SiteFooter } from '@/components/public/SiteFooter'

export const metadata: Metadata = {
  title: 'Drive with QSoS | TriQare',
  description: 'Join QSoS — TriQare’s emergency response network. Driver onboarding & KYC upload.',
}

/**
 * Layout for the driver-upload route group (/drivers and /drivers/apply).
 * Uses the shared public site chrome so these pages stay aligned with the
 * marketing homepage. Nested under the root layout — no <html>/<body> here.
 */
export default function DriverUploadLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
