'use client'

import Link from 'next/link'
import { SiteHeader } from '@/components/public/SiteHeader'
import { SiteFooter } from '@/components/public/SiteFooter'
import { ScrollToTop } from '@/components/ui/scroll-to-top'
import { LandingAnnouncementBanner } from '@/components/LandingAnnouncementBanner'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'
import {
  ArrowRight, Activity, Radio, Ambulance, Building2, ShieldCheck, BarChart3,
  HeartPulse, Users, MapPin, Clock, Phone, Smartphone, Download, Apple,
  PlayCircle, Check,
} from 'lucide-react'

const NAVY = '#003366'
const RED = '#cc3333'

const STATS = [
  { value: '30s', label: 'Avg. response time' },
  { value: '500+', label: 'Connected hospitals' },
  { value: '10K+', label: 'Lives supported' },
  { value: '99.9%', label: 'Platform uptime' },
]

const FEATURES = [
  { icon: Users, title: 'Patient management', body: 'Comprehensive patient records with medical history, emergency contacts and real-time status tracking.' },
  { icon: Ambulance, title: 'Fleet management', body: 'Track ambulances, manage drivers and optimise dispatch with real-time location data.' },
  { icon: Building2, title: 'Hospital network', body: 'Monitor capacity, specialties and availability to ensure optimal patient placement.' },
  { icon: Phone, title: 'SOS response', body: 'Rapid emergency response with automated dispatch, live tracking and communication tools.' },
  { icon: ShieldCheck, title: 'Role-based access', body: 'Secure access control for admins, emergency response teams and transport partners.' },
  { icon: BarChart3, title: 'Real-time analytics', body: 'Reporting and analytics that surface response times and operational efficiency.' },
]

const APP_BULLETS = [
  'One-tap emergency SOS alerts',
  'Real-time ambulance tracking',
  'Medical profile management',
  'GPS navigation for drivers',
  '24/7 emergency support',
]

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <LandingAnnouncementBanner />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-6 pt-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold" style={{ color: NAVY }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#28a745' }} /> Emergency response, operationalised
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Emergency response, <span style={{ color: RED }}>coordinated end to end</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          One real-time platform for patients, ambulances and hospitals — dispatching the right unit in seconds and giving operators full visibility from call to handoff.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: NAVY }}>
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/demo" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Watch live demo
          </Link>
        </div>
      </section>

      {/* Bento showcase */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid auto-rows-[200px] grid-cols-2 gap-4 lg:grid-cols-4">

          {/* Live ops console — 2x2 */}
          <div className="col-span-2 row-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: NAVY }}>
                <Activity className="h-4 w-4" /> Operations console
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[['30s', 'Dispatch'], ['142', 'Active units'], ['500+', 'Hospitals']].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-2xl font-bold text-slate-900">{v}</div>
                  <div className="text-[11px] text-slate-500">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-32 items-end gap-2 rounded-xl border border-slate-100 p-3">
              {[40, 55, 48, 62, 50, 70, 58, 80, 66, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 9 ? RED : '#ccd9e6' }} />
              ))}
            </div>
          </div>

          {/* Feature tile */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <Radio className="h-6 w-6" style={{ color: RED }} />
            <h3 className="mt-3 font-semibold text-slate-900">Real-time dispatch</h3>
            <p className="mt-1 text-sm text-slate-600">Nearest unit, auto-assigned in seconds.</p>
          </div>

          {/* Metric tile (navy) */}
          <div className="rounded-3xl border border-slate-200 p-5 text-white shadow-sm" style={{ background: NAVY }}>
            <HeartPulse className="h-6 w-6 text-white" />
            <div className="mt-3 text-3xl font-bold">10K+</div>
            <p className="mt-1 text-sm text-white/75">Lives supported</p>
          </div>

          {/* Audience tile — wide */}
          <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Built for every actor in the chain</h3>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-medium text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3"><Users className="mx-auto h-5 w-5" style={{ color: NAVY }} /><div className="mt-1.5">Patients</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><Activity className="mx-auto h-5 w-5" style={{ color: NAVY }} /><div className="mt-1.5">ER teams</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><Building2 className="mx-auto h-5 w-5" style={{ color: NAVY }} /><div className="mt-1.5">Transport</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><MapPin className="mx-auto h-5 w-5" style={{ color: NAVY }} /><div className="mt-1.5">Drivers</div></div>
            </div>
          </div>

          {/* Metric tile (light red) */}
          <div className="rounded-3xl border border-slate-200 p-5 shadow-sm" style={{ background: '#f5cccc' }}>
            <Clock className="h-6 w-6" style={{ color: RED }} />
            <div className="mt-3 text-3xl font-bold" style={{ color: NAVY }}>99.9%</div>
            <p className="mt-1 text-sm text-slate-700">Platform uptime</p>
          </div>

          {/* Feature tile */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <ShieldCheck className="h-6 w-6" style={{ color: NAVY }} />
            <h3 className="mt-3 font-semibold text-slate-900">Secure by design</h3>
            <p className="mt-1 text-sm text-slate-600">Encrypted records, auditable handoffs.</p>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="py-14" style={{ background: NAVY }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-sm text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: RED }}>The platform</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">One operating system for the whole response chain</h2>
          <p className="mt-3 text-slate-600">From the moment an SOS is raised to the hospital handoff — every actor on one coordinated, auditable platform.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: '#ccd9e6' }}>
                <f.icon className="h-5 w-5" style={{ color: NAVY }} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile app */}
      <section id="mobile" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#ccd9e6', color: NAVY }}>
                <Smartphone className="h-3.5 w-3.5" /> Mobile app available
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Emergency services, in your pocket</h2>
              <p className="mt-3 text-slate-600">Instant access for patients and drivers on Android and iOS.</p>
              <ul className="mt-6 space-y-3">
                {APP_BULLETS.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="h-5 w-5 flex-shrink-0" style={{ color: '#28a745' }} /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4" style={{ color: '#28a745' }} /> Secure · HIPAA-aligned · 256-bit encryption
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: NAVY }}>
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  <h3 className="font-semibold">Direct download</h3>
                </div>
                <p className="mt-2 text-sm text-white/75">Get the APK directly on your Android device.</p>
                <a href="/Triqare-mobile-app.apk" download="Triqare-mobile-app.apk"
                   className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-bold transition hover:bg-slate-100" style={{ color: NAVY }}>
                  <Download className="h-5 w-5" /> Download APK
                </a>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" /> Or download from stores <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={() => window.open(APP_STORE_URL, '_blank')}
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Apple className="h-5 w-5" /> App Store
                </button>
                <button onClick={() => window.open(PLAY_STORE_URL, '_blank')}
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <PlayCircle className="h-5 w-5" /> Google Play
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl px-8 py-12 text-center md:flex-row md:text-left" style={{ background: NAVY }}>
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to transform emergency response?</h2>
            <p className="mt-2 text-white/75">Bring hospitals, transport partners and emergency teams onto one platform.</p>
          </div>
          <div className="flex flex-shrink-0 gap-3">
            <Link href="/sign-up" className="rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: RED }}>Get started</Link>
            <Link href="/demo" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold transition hover:bg-slate-100" style={{ color: NAVY }}>Watch demo</Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      <ScrollToTop />
    </div>
  )
}
