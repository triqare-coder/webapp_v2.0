'use client'

// Shared public-site header. Single source of truth for marketing/public-page
// chrome so the homepage and inner pages (drivers, apply, demo, registration) stay aligned.
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Smartphone } from 'lucide-react'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'
import { StoreBadge } from '@/components/public/StoreBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const RED = '#cc3333'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        <Link href="/" aria-label="TriQare home">
          <Logo size="header" showText={false} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
          <Link href="/#platform" className="hover:text-slate-900">Platform</Link>
          <Link href="/#mobile" className="hover:text-slate-900">Mobile app</Link>
          <Link href="/drivers" className="hover:text-slate-900">Drive with QSoS</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white focus:outline-none md:inline-flex">
                <Smartphone className="h-4 w-4" /> Get the app
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3">
              <div className="space-y-2.5">
                <StoreBadge
                  href={APP_STORE_URL}
                  img="/badges/app-store.svg"
                  alt="Download on the App Store"
                  platform="ios"
                  line1="Download on the"
                  line2="App Store"
                />
                <StoreBadge
                  href={PLAY_STORE_URL}
                  img="/badges/google-play.svg"
                  alt="Get it on Google Play"
                  platform="android"
                  line1="GET IT ON"
                  line2="Google Play"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/demo" className="hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white sm:inline-flex">
            Live demo
          </Link>
          <Link href="/sign-in" className="hidden text-sm font-semibold text-slate-700 hover:text-slate-900 sm:block">Sign in</Link>
          <Link href="/sign-up" className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: RED }}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
