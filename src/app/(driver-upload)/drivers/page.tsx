import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Ambulance, IndianRupee, Radio, Users, ArrowRight, Mail, Phone,
  ShieldCheck, FileCheck, Car, ClipboardCheck, CheckCircle2,
} from 'lucide-react'

const NAVY = '#003366'
const RED = '#cc3333'

export const metadata: Metadata = {
  title: 'Join QSoS as an Ambulance Partner | TriQare',
  description:
    'Apply to drive with QSoS — TriQare’s emergency response network. Flexible, commission-based earnings and access to emergency ride requests.',
}

const BENEFITS = [
  { icon: IndianRupee, title: 'Flexible earnings', body: 'Commission-based, no fixed salary — you earn on every emergency ride you complete.' },
  { icon: Radio, title: 'Emergency ride requests', body: 'Get connected to nearby emergency requests through the QSoS dispatch network.' },
  { icon: Users, title: 'TriQare team support', body: 'A dedicated operations team backs you up before, during and after every trip.' },
]

const STEPS = [
  { icon: ClipboardCheck, title: 'Apply online', body: 'Fill the 10-minute application and upload your vehicle and license documents.' },
  { icon: ShieldCheck, title: 'Get verified', body: 'Our team reviews your KYC and vehicle compliance, usually within a few days.' },
  { icon: Ambulance, title: 'Start earning', body: 'Go live on the QSoS network and start receiving nearby emergency ride requests.' },
]

const REQUIREMENTS = [
  'Valid commercial driving license',
  'Vehicle registration certificate (RC)',
  'Ambulance permit / fitness certificate',
  'Vehicle insurance & PUC',
  'Aadhaar / government ID',
  'A smartphone with GPS',
]

export default function DriversLandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: '#f5cccc', background: '#f5cccc4d', color: RED }}>
          <Ambulance className="h-3.5 w-3.5" /> QSoS Ambulance Partner Program
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          Drive with QSoS, <span style={{ color: RED }}>save lives on your schedule</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          QSoS is TriQare’s emergency response aggregator — connecting patients in critical moments with the nearest available ambulances. As a partner driver, you join a network that saves lives every day, on your own schedule.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/drivers/apply" className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: RED }}>
            Start application <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="mailto:support@triqare.in" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Talk to our team
          </a>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">Why drive with QSoS</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: '#ccd9e6' }}>
                <b.icon className="h-6 w-6" style={{ color: NAVY }} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16" style={{ background: NAVY }}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-white">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-white/20">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#ccd9e6', color: NAVY }}>
              <FileCheck className="h-3.5 w-3.5" /> Before you apply
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">What you’ll need</h2>
            <p className="mt-3 text-slate-600">Keep these handy — the application takes about 10 minutes and you’ll upload these documents as you go.</p>
            <Link href="/drivers/apply" className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: NAVY }}>
              Start application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: NAVY }}>
              <Car className="h-4 w-4" /> Documents checklist
            </div>
            <ul className="space-y-3">
              {REQUIREMENTS.map((r) => (
                <li key={r} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#28a745' }} /> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Ready to apply?</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">The application takes about 10 minutes. Keep your vehicle and license documents handy to upload.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/drivers/apply" className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: RED }}>
              Start application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-sm text-slate-500 sm:flex-row sm:gap-6">
            <a href="mailto:support@triqare.in" className="inline-flex items-center gap-2 hover:text-slate-900"><Mail className="h-4 w-4" /> support@triqare.in</a>
            <a href="tel:+911800000000" className="inline-flex items-center gap-2 hover:text-slate-900"><Phone className="h-4 w-4" /> 1800-000-000</a>
          </div>
        </div>
      </section>
    </div>
  )
}
