// Shared public-site footer. Pairs with SiteHeader for consistent public-page chrome.
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { StoreBadge } from '@/components/public/StoreBadge'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'
import { Mail, Phone } from 'lucide-react'

const PLATFORM_LINKS = [
  { label: 'Features', href: '/#platform' },
  { label: 'Mobile app', href: '/#mobile' },
  { label: 'Live demo', href: '/demo' },
  { label: 'Sign in', href: '/sign-in' },
  { label: 'Get started', href: '/sign-up' },
]

const PARTNER_LINKS = [
  { label: 'Drive with QSoS', href: '/drivers' },
  { label: 'Driver application', href: '/drivers/apply' },
  { label: 'Register as patient', href: '/register/patient' },
  { label: 'Transport company', href: '/register/transport-company' },
]

export function SiteFooter() {
  return (
    <footer className="bg-[#003366] text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand + contact */}
          <div>
            <Logo size="lg" showText={false} variant="footer" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              QSoS by TriQare — the real-time platform connecting patients, ambulances and hospitals, so the right help arrives faster.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <a href="mailto:support@triqare.in" className="flex items-center gap-2 text-white/80 transition hover:text-white">
                <Mail className="h-4 w-4" /> support@triqare.in
              </a>
              <a href="tel:+911800000000" className="flex items-center gap-2 text-white/80 transition hover:text-white">
                <Phone className="h-4 w-4" /> 1800-000-000
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Platform</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/70 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Partners</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {PARTNER_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/70 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* App */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Get the app</h3>
            <div className="mt-4 space-y-2.5">
              <StoreBadge href={APP_STORE_URL} img="/badges/app-store.svg" alt="Download on the App Store" platform="ios" line1="Download on the" line2="App Store" />
              <StoreBadge href={PLAY_STORE_URL} img="/badges/google-play.svg" alt="Get it on Google Play" platform="android" line1="GET IT ON" line2="Google Play" />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row">
          <p>© 2026 TriQare. All rights reserved.</p>
          <p>Emergency response platform · Made in India</p>
        </div>
      </div>
    </footer>
  )
}
