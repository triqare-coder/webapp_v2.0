import Link from 'next/link'

/**
 * US-001 AC3: the 72-hour setup link has expired (or was already used).
 * Reached from /hospital/set-password, and public — an expired token means the
 * visitor has no session and no way to get one without help.
 */
export default function HospitalLinkExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(0,51,102,0.08)]">
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f5cccc] text-xl">
          ⏳
        </div>
        <h1 className="mb-3 text-xl font-semibold text-[#003366]">This setup link has expired</h1>
        <p className="mb-4 text-sm leading-relaxed text-neutral-600">
          For security, the link in your onboarding email is valid for 72 hours and can only be
          used once. This one is no longer valid.
        </p>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600">
          Contact{' '}
          <a href="mailto:support@triqare.com" className="font-medium text-[#cc3333] underline">
            support@triqare.com
          </a>{' '}
          and we will send you a fresh link.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#003366] px-5 text-sm font-medium text-white hover:bg-[#002347]"
        >
          Go to sign in
        </Link>
      </div>
    </main>
  )
}
