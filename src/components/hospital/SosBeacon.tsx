'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useHospitalRealtime } from '@/hooks/useHospitalRealtime'
import { MIN_VOLUME, useSiren } from '@/hooks/useSiren'
import { formatEta } from '@/lib/hospital/eta'
import { useHospital } from './HospitalContext'

export interface HospitalAlert {
  id: string
  sos_request_id: string
  patient_id: string | null
  registration_type: 'PRIMARY' | 'SECONDARY'
  status: 'PENDING' | 'CONFIRMED_INCOMING' | 'CANCELLED'
  outcome: 'PENDING' | 'ADMITTED' | 'CANCELLED'
  triggered_at: string
  destination_label: string | null
  destination_kind: 'primary' | 'secondary' | 'nearby' | null
  eta_minutes: number | null
  patient_name: string | null
  blood_group: string | null
  known_conditions: string | null
  allergies: string | null
}

const ETA_REFRESH_MS = 60_000

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/**
 * The red beacon (US-006/007/008).
 *
 * Rendered in the hospital layout as a fixed full-viewport overlay, so it covers
 * whatever page is open. Note it is an in-page overlay, NOT a popup window --
 * which is how it satisfies "must not be suppressible by browser pop-up
 * blockers": there is nothing for a blocker to suppress.
 *
 * Dismissing hides the banner and stops the sound but changes no state: the
 * alert stays in the notification centre and on the patient record (AC3).
 */
export function SosBeacon() {
  const { hospital } = useHospital()
  const [alerts, setAlerts] = useState<HospitalAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [eta, setEta] = useState<Record<string, number | null>>({})
  const { start, stop, unlock, volume, setVolume, blocked } = useSiren()
  const startedFor = useRef<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/hospital/alerts')
    if (!res.ok) return
    const data = await res.json()
    setAlerts(data.alerts ?? [])
  }, [])

  useEffect(() => {
    if (hospital) void load()
  }, [hospital, load])

  useHospitalRealtime('hospital_sos_alerts', hospital?.hospitalId ?? null, {
    onChange: () => void load(),
  })

  // The alert on screen: the newest one still in play that has not been
  // dismissed. Cancellations are shown too, so a hospital sees WHY it stood down.
  const active = useMemo(
    () =>
      alerts.find(
        (a) =>
          !dismissed.has(a.id) &&
          (a.status !== 'CANCELLED' || (a.outcome === 'CANCELLED' && a.destination_label)),
      ) ?? null,
    [alerts, dismissed],
  )

  // Sound only for alerts that still need a response. A cancellation notice is
  // information, not an emergency.
  const shouldSound = !!active && active.status !== 'CANCELLED'

  useEffect(() => {
    if (shouldSound && active) {
      if (startedFor.current !== active.id) {
        startedFor.current = active.id
        start()
      }
    } else {
      startedFor.current = null
      stop()
    }
  }, [shouldSound, active, start, stop])

  // US-008: recompute from the driver's live position every 60s. There is no
  // cached route to go stale, so a detour surfaces on the next poll.
  useEffect(() => {
    if (!active || active.status !== 'CONFIRMED_INCOMING') return
    let cancelled = false
    const poll = async () => {
      const res = await fetch(`/api/hospital/alerts/${active.id}/eta`)
      if (!res.ok || cancelled) return
      const data = await res.json()
      setEta((prev) => ({ ...prev, [active.id]: data.etaMinutes ?? null }))
    }
    void poll()
    const timer = window.setInterval(poll, ETA_REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [active])

  if (!active) return null

  const cancelled = active.status === 'CANCELLED'
  const incoming = active.status === 'CONFIRMED_INCOMING'
  const etaMinutes = eta[active.id] ?? active.eta_minutes ?? null

  const cancellationNotice =
    active.destination_kind === 'nearby'
      ? 'Patient is being taken to the nearest available facility'
      : `Patient is being taken to ${active.destination_label ?? 'another facility'}`

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={cancelled ? 'SOS cancelled' : 'Emergency SOS alert'}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className={`w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ${
          cancelled ? '' : 'ring-4 ring-[#cc3333]'
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 text-white ${
            cancelled ? 'bg-neutral-600' : incoming ? 'bg-[#0b7a5a]' : 'bg-[#cc3333]'
          } ${!cancelled && !incoming ? 'animate-pulse' : ''}`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-90">
              {cancelled ? 'Stand down' : incoming ? 'Confirmed incoming' : 'Emergency SOS'}
            </p>
            <p className="text-lg font-bold">
              {cancelled ? 'Patient is not coming here' : incoming ? formatEta(etaMinutes) : 'Prepare a bed — destination pending'}
            </p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">
            {active.registration_type}
          </span>
        </div>

        <div className="space-y-4 p-6">
          {cancelled ? (
            <p className="text-sm leading-relaxed text-neutral-700">{cancellationNotice}.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Patient</dt>
                <dd className="text-lg font-semibold text-[#003366]">{active.patient_name ?? 'Unknown patient'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Time of SOS</dt>
                <dd className="text-neutral-800">{clockTime(active.triggered_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Blood Group</dt>
                <dd className="font-semibold text-[#cc3333]">{active.blood_group ?? 'Not provided'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Known Conditions</dt>
                <dd className="text-neutral-800">{active.known_conditions || 'None recorded'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Allergies</dt>
                <dd className="text-neutral-800">{active.allergies || 'None recorded'}</dd>
              </div>
            </dl>
          )}

          {blocked && !cancelled && (
            <button
              onClick={unlock}
              className="w-full rounded-lg bg-amber-100 px-4 py-3 text-left text-sm font-medium text-amber-900 hover:bg-amber-200"
            >
              🔇 Your browser is blocking the alert sound. Click here to enable it.
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4">
            {active.patient_id && (
              <Link
                href={`/hospital/patients/${active.patient_id}`}
                className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#002347]"
              >
                View Full Profile
              </Link>
            )}
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(active.id))}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Dismiss
            </button>

            {!cancelled && (
              <label className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
                Volume
                <input
                  type="range"
                  min={MIN_VOLUME}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                  className="w-24"
                  aria-label="Alert volume"
                />
              </label>
            )}
          </div>

          {!cancelled && (
            <p className="text-xs text-neutral-400">
              Dismissing keeps this alert in your notification centre and on the patient record.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
