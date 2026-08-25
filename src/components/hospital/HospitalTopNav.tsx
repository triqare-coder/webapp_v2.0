'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/browser'
import { useHospital } from './HospitalContext'
import { HospitalNotificationBell } from './HospitalNotificationBell'

const LINKS = [
  { href: '/hospital', label: 'Home' },
  { href: '/hospital/patients', label: 'Patients' },
  { href: '/hospital/history', label: 'Admission History' },
]

/** Persistent top nav (US-002): hospital name | Home Patients History | bell, email, logout. */
export function HospitalTopNav() {
  const { hospital } = useHospital()
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await getBrowserSupabase().auth.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/hospital" className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#cc3333] text-sm font-bold text-white">
            Q
          </span>
          <span className="truncate text-sm font-semibold text-[#003366]">
            {hospital?.hospitalName ?? 'QSOS Hospital Dashboard'}
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-center gap-1">
          {LINKS.map((link) => {
            // Exact match for Home, prefix for the rest, so /hospital/patients
            // does not light up Home as well.
            const active = link.href === '/hospital' ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-[#003366] text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <HospitalNotificationBell />
          <span className="hidden max-w-[180px] truncate text-xs text-neutral-500 md:inline">
            {hospital?.adminEmail}
          </span>
          <button
            onClick={signOut}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  )
}
