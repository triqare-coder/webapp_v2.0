import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Public support page.
 *
 * WHY IT EXISTS. Both stores require a Support URL that answers, and App Review
 * rejected 2.0.2 under Guideline 1.5 because every URL on the listing pointed at
 * www.triqare.in, which stopped resolving. The portal is the one domain we
 * control that is reliably up, so support lives here.
 *
 * DELIBERATELY UNAUTHENTICATED — see PUBLIC_PREFIXES in src/middleware.ts. A
 * reviewer, or a user locked out of their account, must be able to read it
 * without signing in; a support page behind a login is exactly the failure the
 * rejection describes.
 *
 * A server component with no client JS: nothing to hydrate, nothing to fail.
 */
export const metadata: Metadata = {
  title: 'Support — QSoS by Triqare',
  description:
    'Help and contact details for QSoS, the Triqare emergency ambulance app: raising an SOS, emergency contacts, account help.',
}

const SUPPORT_EMAIL = 'info@triqare.com'
const SUPPORT_PHONE = '+91 93249 11500'
const SUPPORT_PHONE_TEL = '+919324911500'

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How do I raise an emergency (SOS)?',
    a: (
      <>
        Open QSoS and press the red <strong>SOS</strong> button on the home screen. The app
        sends your current location to nearby ambulance partners and notifies the emergency
        contacts you have added. You can cancel at any time from the same screen.
      </>
    ),
  },
  {
    q: 'The SOS button is greyed out. Why?',
    a: (
      <>
        SOS becomes available once your profile is complete: personal details, at least one
        emergency contact, and both a primary and secondary hospital. Open the menu →{' '}
        <strong>Edit Profile</strong> to finish setup. The button is also disabled outside
        India, where the service does not operate.
      </>
    ),
  },
  {
    q: 'No ambulance was assigned. What should I do?',
    a: (
      <>
        QSoS operates in selected areas and is expanding. If no ambulance can be assigned, the
        app tells you so and offers a one-tap call to <strong>108</strong>, India&apos;s
        national ambulance line. Call 108 immediately — do not wait for the app to retry.
      </>
    ),
  },
  {
    q: 'Can someone raise an SOS on my behalf?',
    a: (
      <>
        Yes. Anyone you have added as an emergency contact, who also uses QSoS, can raise an
        SOS for you from their own app. The ambulance is sent to your last known location.
      </>
    ),
  },
  {
    q: 'I cannot sign in / I forgot my password.',
    a: (
      <>
        On the sign-in screen choose <strong>Forgot password</strong>. We email an 8-digit
        code — type it into the app along with your new password. If the email does not
        arrive, check spam, then contact us at {SUPPORT_EMAIL}.
      </>
    ),
  },
  {
    q: 'How do I delete my account and data?',
    a: (
      <>
        Email {SUPPORT_EMAIL} from the address on your account and we will delete it, along
        with the personal data described in our{' '}
        <Link href="/privacy-policy" className="text-red-700 underline">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-700">
            QSoS by Triqare
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Support</h1>
          <p className="mt-3 text-gray-600">
            Help with the QSoS emergency ambulance app. For a medical emergency in progress,
            always call <strong>108</strong> if an ambulance has not been assigned.
          </p>
        </header>

        <section className="mb-10 rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900">In an emergency</h2>
          <p className="mt-2 text-gray-700">
            QSoS uses automated dispatch and operates in selected areas of India. If the app
            cannot assign an ambulance, call{' '}
            <a href="tel:108" className="font-semibold text-red-700 underline">
              108
            </a>{' '}
            straight away. Do not rely on the app alone.
          </p>
        </section>

        <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contact us</h2>
          <dl className="mt-4 space-y-3 text-gray-700">
            <div className="flex flex-wrap gap-2">
              <dt className="w-24 font-medium text-gray-900">Email</dt>
              <dd>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-red-700 underline">
                  {SUPPORT_EMAIL}
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="w-24 font-medium text-gray-900">Phone</dt>
              <dd>
                <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-red-700 underline">
                  {SUPPORT_PHONE}
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="w-24 font-medium text-gray-900">Company</dt>
              <dd>Triqare Healthtech Private Limited, India</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="w-24 font-medium text-gray-900">Response</dt>
              <dd>We aim to reply to support email within two working days.</dd>
            </div>
          </dl>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Common questions</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold text-gray-900">{q}</h3>
                <p className="mt-2 leading-relaxed text-gray-700">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-gray-200 pt-6 text-sm text-gray-500">
          <Link href="/privacy-policy" className="text-red-700 underline">
            Privacy Policy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/get-app" className="text-red-700 underline">
            Get the app
          </Link>
          <p className="mt-3">© {new Date().getFullYear()} Triqare Healthtech Private Limited</p>
        </footer>
      </div>
    </main>
  )
}
