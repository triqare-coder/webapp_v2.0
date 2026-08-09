import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Public privacy policy.
 *
 * WHY IT EXISTS. The URL on both store listings (www.triqare.in/privacy-policy)
 * stopped resolving, which is what App Review rejected 2.0.2 for under Guideline
 * 1.5. This serves the same document from the portal, which we control and which
 * is up.
 *
 * WHAT IT SAYS. Every category below is drawn from what the product actually
 * stores and transmits — the users / patients / emergency_contacts /
 * sos_requests / device_tokens tables and the FCM, APNs, Maps, Supabase and
 * Resend integrations — rather than from generic policy boilerplate. If the data
 * model changes, this page has to change with it.
 *
 * DELIBERATELY UNAUTHENTICATED — see PUBLIC_PREFIXES in src/middleware.ts.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy — QSoS by Triqare',
  description:
    'How QSoS by Triqare collects, uses, shares and protects your personal and health information.',
}

const LAST_UPDATED = '9 August 2026'
const CONTACT_EMAIL = 'info@triqare.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3 leading-relaxed text-gray-700">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-700">
            QSoS by Triqare
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated {LAST_UPDATED}</p>
          <p className="mt-4 text-gray-600">
            QSoS is an emergency ambulance service operated by Triqare Healthtech Private
            Limited (&ldquo;Triqare&rdquo;, &ldquo;we&rdquo;). This policy explains what we
            collect, why, and who it is shared with. Because QSoS exists to get an ambulance
            to you, some of this information is shared with responders at the moment you
            raise an emergency.
          </p>
        </header>

        <Section title="Information we collect">
          <p>
            <strong>Account details.</strong> Your name, email address, phone number, and (if
            you add one) a profile photo. Drivers additionally provide licence, vehicle and
            transport-company details.
          </p>
          <p>
            <strong>Health and profile information you enter.</strong> Date of birth, gender,
            address, blood group, allergies, medical conditions, current medications, and
            insurance details. This is your Medical ID. You choose what to enter; the more
            complete it is, the more responders know on arrival.
          </p>
          <p>
            <strong>Emergency contacts.</strong> The name, phone number, email address and
            relationship of the people you nominate, plus your choice of primary and
            secondary hospital.
          </p>
          <p>
            <strong>Location.</strong> Your device&apos;s location when you raise an SOS, and
            your most recent known location, saved so that an emergency contact can raise an
            SOS on your behalf if you cannot. For drivers, live location is shared while a
            trip is active so the patient can see the ambulance approaching. Location is not
            tracked continuously in the background for patients.
          </p>
          <p>
            <strong>Emergency records.</strong> Each SOS you raise: time, location, status
            history, the ambulance and driver assigned, and the hospital involved.
          </p>
          <p>
            <strong>Device and technical data.</strong> A push-notification token per device
            (so we can alert you and your contacts), device platform, app version, and
            diagnostic logs. We record the date and version of the terms you accept.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            To dispatch an ambulance to your location; to give responders the medical
            information they need to treat you; to notify your emergency contacts that an SOS
            has been raised and keep them updated; to let you review your own emergency
            history; to operate and secure your account; and to improve dispatch coverage and
            reliability.
          </p>
          <p>
            We do not sell your personal or health information, and we do not use it for
            advertising.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            <strong>Ambulance drivers and transport partners</strong> — when you raise an SOS,
            the assigned driver receives your name, phone number, pickup location and Medical
            ID, so they can reach and treat you.
          </p>
          <p>
            <strong>Hospitals</strong> — the hospital you are taken to may receive your
            details for admission.
          </p>
          <p>
            <strong>Your emergency contacts</strong> — they are told that you have raised an
            SOS and can follow its status. Contacts who use QSoS can also raise an SOS for
            you.
          </p>
          <p>
            <strong>Service providers who run the platform on our behalf</strong> — Supabase
            (database, authentication), Google Firebase Cloud Messaging and Apple Push
            Notification service (notifications), Google Maps (mapping and geocoding), and
            Resend (email delivery). They process data only to provide those services.
          </p>
          <p>
            <strong>Legal</strong> — where required by law, or to protect the safety of a
            person in an emergency.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Account and profile information is kept while your account exists. Emergency
            records are kept after that where we need them for medical, safety or legal
            reasons. Ask us to delete your account and we will remove your personal data
            except anything we are required to retain.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Data is encrypted in transit, held on access-controlled infrastructure, and
            reachable only by the account it belongs to, the responders handling an active
            emergency, and authorised Triqare staff. No system is perfectly secure, and we
            will tell you if a breach affects your information.
          </p>
        </Section>

        <Section title="Your choices and rights">
          <p>
            You can view and edit your profile, Medical ID and emergency contacts in the app
            at any time, and you can revoke location or notification permission in your device
            settings — though SOS cannot dispatch an ambulance without location.
          </p>
          <p>
            To request a copy of your data, correct it, or delete your account, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-700 underline">
              {CONTACT_EMAIL}
            </a>{' '}
            from your registered address.
          </p>
        </Section>

        <Section title="Children">
          <p>
            QSoS is not intended for children under 18 to use on their own. A parent or
            guardian may hold an account and add a child&apos;s details.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We will post any changes on this page and update the date above. Material changes
            will also be notified in the app.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Triqare Healthtech Private Limited, India
            <br />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-700 underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="border-t border-gray-200 pt-6 text-sm text-gray-500">
          <Link href="/support" className="text-red-700 underline">
            Support
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
