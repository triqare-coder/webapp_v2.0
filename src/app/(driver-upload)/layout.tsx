import type { Metadata } from 'next'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Driver Upload | TriQare',
  description: 'Driver onboarding & KYC upload',
}

/**
 * Base layout for the driver-upload route group.
 *
 * Mobile-first: a single, comfortably-padded column on phones that grows into a
 * centered max-width canvas on larger screens. Brand chrome (TriQare red header)
 * lives here so every route in the group inherits it. Nested under the root
 * layout, so no <html>/<body> here.
 */
export default function DriverUploadLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5cccc]/30 via-white to-white">
      {/* Brand header */}
      <header className="sticky top-0 z-10 border-b border-[#e6e6e6] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#f5cccc] bg-white shadow-sm">
            <Logo size="xs" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-[#1a1a1a] sm:text-lg">
              Driver Onboarding
            </h1>
            <p className="truncate text-xs text-[#666666] sm:text-sm">
              TriQare · KYC &amp; document upload
            </p>
          </div>
        </div>
      </header>

      {/* Page canvas */}
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 pt-2 text-center text-xs text-[#999999] sm:px-6">
        © TriQare · Emergency Response Platform
      </footer>
    </div>
  )
}
