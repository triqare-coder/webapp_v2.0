'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/browser'
import { hospitalPasswordSchema, passwordRuleState } from '@/lib/hospital/password'

/**
 * US-001 first-login password reset. The onboarding email's "Set Up My Dashboard"
 * button lands here with a one-time token; on success the admin is signed in and
 * dropped on their own dashboard, and the temporary password stops working.
 */
function SetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [checking, setChecking] = useState(true)
  const [hospitalName, setHospitalName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Validate before rendering the form, so an expired link never shows a form
  // that is guaranteed to fail on submit.
  useEffect(() => {
    let cancelled = false
    if (!token) {
      router.replace('/hospital/link-expired')
      return
    }
    ;(async () => {
      const res = await fetch('/api/hospital/onboarding/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (cancelled) return
      if (!data.valid) {
        router.replace('/hospital/link-expired')
        return
      }
      setHospitalName(data.hospitalName)
      setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

  const rules = passwordRuleState(password)
  const policyOk = hospitalPasswordSchema.safeParse(password).success
  const matches = password.length > 0 && password === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!policyOk) return setError('Your password does not meet all the requirements below.')
    if (!matches) return setError('The two passwords do not match.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/hospital/onboarding/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.reason) {
          router.replace('/hospital/link-expired')
          return
        }
        setError(data.error ?? 'Could not set your password.')
        return
      }

      // Sign in with what was just set, so the admin lands on their dashboard
      // rather than on a sign-in form immediately after choosing a password.
      const { error: signInError } = await getBrowserSupabase().auth.signInWithPassword({
        email: data.email,
        password,
      })
      if (signInError) {
        router.replace('/sign-in?redirect_url=/hospital')
        return
      }
      router.replace('/hospital')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <p className="text-sm text-neutral-500">Checking your setup link…</p>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(0,51,102,0.08)]">
        <p className="text-xs font-medium uppercase tracking-wide text-[#cc3333]">QSOS by Triqare</p>
        <h1 className="mt-2 text-xl font-semibold text-[#003366]">{hospitalName}</h1>
        <p className="mt-2 mb-6 text-sm text-neutral-600">
          Choose a password to finish setting up your QSOS Hospital Dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-[#003366]"
              required
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-neutral-700">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-[#003366]"
              required
            />
            {confirm.length > 0 && !matches && (
              <p className="mt-1 text-xs text-[#cc3333]">The two passwords do not match.</p>
            )}
          </div>

          <ul className="space-y-1 rounded-lg bg-[#f5f7fa] p-3">
            {rules.map((r) => (
              <li
                key={r.label}
                className={`flex items-center gap-2 text-xs ${r.met ? 'text-emerald-700' : 'text-neutral-500'}`}
              >
                <span aria-hidden>{r.met ? '✓' : '○'}</span>
                {r.label}
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="rounded-lg bg-[#f5cccc] px-3 py-2 text-sm text-[#8a1f1f]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !policyOk || !matches}
            className="h-11 w-full rounded-lg bg-[#003366] text-sm font-medium text-white hover:bg-[#002347] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Setting up…' : 'Set Up My Dashboard'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function HospitalSetPasswordPage() {
  // useSearchParams needs a Suspense boundary to keep this route from opting
  // the whole segment into client-side bailout during prerender.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  )
}
