'use client'

// Renders an official store badge image (from /public/badges) with a graceful
// fallback to an icon + text pill if the image file isn't present yet.
// Takes a `platform` string (not an icon function) so it can be used from both
// server and client components without crossing the RSC serialization boundary.
import { useState } from 'react'
import { Apple, Bot } from 'lucide-react'

const FALLBACK_ICON = { ios: Apple, android: Bot }

interface StoreBadgeProps {
  href: string
  img: string
  alt: string
  platform: 'ios' | 'android'
  line1: string
  line2: string
}

export function StoreBadge({ href, img, alt, platform, line1, line2 }: StoreBadgeProps) {
  const [broken, setBroken] = useState(false)
  const Icon = FALLBACK_ICON[platform]

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={alt}
          onError={() => setBroken(true)}
          className="h-10 w-auto"
        />
      ) : (
        <span className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white transition hover:bg-slate-800">
          <Icon className="h-6 w-6 shrink-0" />
          <span className="leading-tight">
            <span className="block text-[10px] text-slate-300">{line1}</span>
            <span className="block text-sm font-semibold">{line2}</span>
          </span>
        </span>
      )}
    </a>
  )
}
