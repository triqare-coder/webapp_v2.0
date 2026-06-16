import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Ambulance, IndianRupee, Radio, Users, ArrowRight, Mail, Phone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Join QSoS as an Ambulance Partner | TriQare',
  description:
    'Apply to drive with QSoS — TriQare’s emergency response network. Flexible, commission-based earnings and access to emergency ride requests.',
}

const BENEFITS = [
  {
    icon: IndianRupee,
    title: 'Flexible earnings',
    body: 'Commission-based, no fixed salary — you earn on every emergency ride you complete.',
  },
  {
    icon: Radio,
    title: 'Emergency ride requests',
    body: 'Get connected to nearby emergency requests through the QSoS dispatch network.',
  },
  {
    icon: Users,
    title: 'TriQare team support',
    body: 'A dedicated operations team backs you up before, during and after every trip.',
  },
]

export default function DriversLandingPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f5cccc] bg-[#f5cccc]/30 px-3 py-1 text-xs font-medium text-[#cc3333]">
          <Ambulance className="h-3.5 w-3.5" />
          QSoS Ambulance Partner Program
        </span>
        <h1 className="text-3xl font-bold leading-tight text-[#1a1a1a] sm:text-4xl">
          Join QSoS as an{' '}
          <span className="text-[#cc3333]">Ambulance Partner</span>
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[#555555] sm:text-base">
          QSoS is TriQare’s emergency response aggregator — connecting patients in
          critical moments with the nearest available ambulances. As a partner driver,
          you become part of a network that saves lives every day, on your own schedule.
        </p>
        <div className="flex justify-center pt-2">
          <Button
            asChild
            size="lg"
            className="bg-[#cc3333] text-white hover:bg-[#b32d2d]"
          >
            <Link href="/drivers/apply">
              Start Application
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-4">
        <h2 className="text-center text-lg font-semibold text-[#003366]">
          Why drive with QSoS
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-[#e6e6e6]">
              <CardContent className="space-y-2 p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#ccd9e6]/40 text-[#003366]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#666666]">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="rounded-lg border border-[#e6e6e6] bg-gradient-to-br from-[#f5cccc]/20 to-white p-6 text-center">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Ready to apply?</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#666666]">
          The application takes about 10 minutes. Keep your vehicle and license
          documents handy to upload.
        </p>
        <div className="mt-4 flex justify-center">
          <Button asChild className="bg-[#cc3333] text-white hover:bg-[#b32d2d]">
            <Link href="/drivers/apply">
              Start Application
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section className="flex flex-col items-center gap-2 border-t border-[#e6e6e6] pt-6 text-sm text-[#666666] sm:flex-row sm:justify-center sm:gap-6">
        <a
          href="mailto:support@triqare.in"
          className="inline-flex items-center gap-2 hover:text-[#cc3333]"
        >
          <Mail className="h-4 w-4" />
          support@triqare.in
        </a>
        <a
          href="tel:+911800000000"
          className="inline-flex items-center gap-2 hover:text-[#cc3333]"
        >
          <Phone className="h-4 w-4" />
          1800-000-000
        </a>
      </section>
    </div>
  )
}
