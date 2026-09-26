'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useHospitalRealtime } from '@/hooks/useHospitalRealtime'
import { etaCaption, useLiveEtas } from '@/hooks/useLiveEtas'
import { formatDateTime, type Stage } from '@/lib/hospital/journey'
import { useHospital } from './HospitalContext'
import { JourneyPanel } from './JourneyPanel'
import { HOSPITAL_CARD } from './StatTile'

interface Emergency {
  id: string
  patient_id: string | null
  registration_type: 'PRIMARY' | 'SECONDARY'
  status: 'PENDING' | 'CONFIRMED_INCOMING'
  triggered_at: string
  destination_label: string | null
  eta_minutes: number | null
  patient_name: string | null
  blood_group: string | null
  stage: Stage
}

const STAGE_STYLE: Record<string, string> = {
  TRIGGERED: 'bg-[#f5cccc] text-[#cc3333]',
  AMBULANCE_EN_ROUTE: 'bg-[#ffe8c2] text-[#8a5a00]',
  AMBULANCE_AT_PATIENT: 'bg-[#ffe8c2] text-[#8a5a00]',
  EN_ROUTE_TO_HOSPITAL: 'bg-[#cce9dd] text-[#0b7a5a]',
}

function clock(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/**
 * The Patients tab: every SOS this hospital is currently preparing for.
 *
 * Only pending and confirmed-incoming emergencies are listed; an admission or a
 * stand-down moves the row to Admission History on the next change. Stage and ETA
 * follow the live SOS: the stage from the driver's workflow, the ETA recomputed
 * from the ambulance's GPS every 60s once this hospital is the destination.
 *
 * `focusAlertId` (from ?alert=, e.g. a clicked notification) highlights that row
 * and opens its journey.
 */
export function ActiveEmergencies({ focusAlertId }: { focusAlertId?: string | null }) {
  const { hospital } = useHospital()
  const [rows, setRows] = useState<Emergency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [journeyFor, setJourneyFor] = useState<string | null>(focusAlertId ?? null)

  useEffect(() => {
    if (focusAlertId) setJourneyFor(focusAlertId)
  }, [focusAlertId])

  const load = useCallback(async () => {
    const res = await fetch('/api/hospital/emergencies')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError(data.error ?? 'Could not load active emergencies.')
    else {
      setError(null)
      setRows(data.emergencies ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (hospital) void load()
  }, [hospital, load])

  useHospitalRealtime('hospital_sos_alerts', hospital?.hospitalId ?? null, {
    onChange: () => void load(),
  })

  const etas = useLiveEtas(rows.filter((r) => r.status === 'CONFIRMED_INCOMING').map((r) => r.id))

  return (
    <>
      <section className={`${HOSPITAL_CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#003366]">Active SOS Patients</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{rows.length}</span>
          <span className="ml-auto text-xs text-neutral-400">Updates live · ETA refreshes every 60s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-6 py-3 font-medium">SOS Date &amp; Time</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 font-medium">ETA</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-neutral-400">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[#cc3333]">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-neutral-400">
                    No active emergencies. Admitted and cancelled SOS records are in Admission History.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const incoming = r.status === 'CONFIRMED_INCOMING'
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-neutral-50 last:border-0 ${
                        r.id === focusAlertId ? 'bg-[#fff6e5]' : 'hover:bg-neutral-50/60'
                      }`}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">{formatDateTime(r.triggered_at)}</td>
                      <td className="px-6 py-3">
                        <span className="font-medium text-neutral-800">{r.patient_name ?? 'Unknown'}</span>
                        <span className="block text-xs font-semibold text-[#cc3333]">{r.blood_group ?? ''}</span>
                      </td>
                      <td className="px-6 py-3 text-xs font-semibold text-neutral-600">{r.registration_type}</td>
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_STYLE[r.stage.key] ?? ''}`}>
                          {r.stage.label}
                        </span>
                        {r.stage.at && <span className="mt-1 block text-xs text-neutral-400">since {clock(r.stage.at)}</span>}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {incoming ? (
                          <span className="font-semibold text-[#0b7a5a]">{etaCaption(etas[r.id], r.eta_minutes)}</span>
                        ) : (
                          <span className="text-xs text-neutral-400">Destination pending</span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setJourneyFor(r.id)}
                          className="mr-4 font-medium text-[#003366] hover:underline"
                        >
                          View Journey
                        </button>
                        {r.patient_id && (
                          <Link href={`/hospital/patients/${r.patient_id}`} className="font-medium text-[#cc3333] hover:underline">
                            Profile
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {journeyFor && <JourneyPanel alertId={journeyFor} onClose={() => setJourneyFor(null)} />}
    </>
  )
}
