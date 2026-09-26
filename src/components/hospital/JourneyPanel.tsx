'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDateTime, formatDuration, type JourneyStep, type JourneySummary, type Stage } from '@/lib/hospital/journey'

interface JourneyResponse {
  alert: {
    id: string
    patient_id: string | null
    patient_name: string | null
    blood_group: string | null
    registration_type: 'PRIMARY' | 'SECONDARY'
    effective_outcome: 'PENDING' | 'ADMITTED' | 'CANCELLED'
    triggered_at: string
    eta_at_confirmation_minutes: number | null
    destination_kind: string | null
  }
  stage: Stage
  steps: JourneyStep[]
  summary: JourneySummary
  closedAt: string | null
}

const OUTCOME_STYLE: Record<string, string> = {
  ADMITTED: 'bg-[#cce9dd] text-[#0b7a5a]',
  CANCELLED: 'bg-neutral-200 text-neutral-600',
  PENDING: 'bg-[#ffe8c2] text-[#8a5a00]',
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

/**
 * The complete journey of one SOS: every stage with its time and the elapsed
 * time since the SOS, plus total / response / transport durations. Opened from
 * the Patients tab, Admission History, or a notification. While the SOS is live
 * it refreshes itself, so it can be left open as a tracker.
 */
export function JourneyPanel({ alertId, onClose }: { alertId: string; onClose: () => void }) {
  const [data, setData] = useState<JourneyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const live = data?.alert.effective_outcome === 'PENDING'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/hospital/alerts/${alertId}/journey`)
      const body = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) setError(body.error ?? 'Could not load this SOS.')
      else setData(body)
    }
    void load()
    const timer = window.setInterval(load, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [alertId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SOS journey"
      className="fixed inset-0 z-[90] flex justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">SOS journey</p>
            <p className="truncate text-lg font-semibold text-[#003366]">
              {data ? data.alert.patient_name ?? 'Unknown patient' : 'Loading…'}
            </p>
            {data && (
              <p className="mt-0.5 text-xs text-neutral-500">
                {data.alert.registration_type} · {data.alert.blood_group ?? 'Blood group not provided'} · SOS{' '}
                {formatDateTime(data.alert.triggered_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-neutral-500 hover:bg-neutral-100"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <p className="text-sm text-[#cc3333]">{error}</p>
          ) : !data ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OUTCOME_STYLE[data.alert.effective_outcome]}`}>
                  {data.alert.effective_outcome === 'PENDING' ? 'IN PROGRESS' : data.alert.effective_outcome}
                </span>
                <span className="text-sm text-neutral-700">{data.stage.label}</span>
                {live && <span className="text-xs text-neutral-400">· updates live</span>}
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: live ? 'Elapsed' : 'Total journey', value: live ? Date.now() - new Date(data.alert.triggered_at).getTime() : data.summary.totalMs },
                  { label: 'SOS → ambulance at patient', value: data.summary.responseMs },
                  { label: 'Pickup → arrival', value: data.summary.transportMs },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-[#f5f7fa] px-3 py-2">
                    <dt className="text-[11px] leading-tight text-neutral-500">{m.label}</dt>
                    <dd className="mt-1 text-base font-semibold text-[#003366]">{formatDuration(m.value)}</dd>
                  </div>
                ))}
              </dl>
              {data.alert.eta_at_confirmation_minutes != null && data.alert.destination_kind !== 'nearby' && (
                <p className="mt-2 text-xs text-neutral-500">
                  ETA quoted at confirmation: {data.alert.eta_at_confirmation_minutes} min
                </p>
              )}

              <ol className="mt-6 space-y-0">
                {data.steps.map((s, i) => (
                  <li key={`${s.at}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < data.steps.length - 1 && (
                      <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-neutral-200" />
                    )}
                    <span
                      aria-hidden
                      className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${
                        s.hospital ? 'bg-[#003366]' : 'bg-[#cc3333]'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-neutral-800">{s.label}</p>
                        <p className="shrink-0 text-xs tabular-nums text-neutral-400">+{formatDuration(s.sinceSosMs)}</p>
                      </div>
                      <p className="text-xs text-neutral-500">{clock(s.at)}</p>
                      {s.detail && <p className="mt-0.5 text-xs text-neutral-600">{s.detail}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-[11px] text-neutral-400">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#cc3333]" /> SOS stage
                <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-[#003366]" /> Your hospital
              </p>
            </>
          )}
        </div>

        {data?.alert.patient_id && (
          <div className="border-t border-neutral-200 px-6 py-3">
            <Link
              href={`/hospital/patients/${data.alert.patient_id}`}
              className="text-sm font-medium text-[#cc3333] hover:underline"
            >
              View Full Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
