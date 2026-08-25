'use client'

import { useCallback, useEffect, useState } from 'react'
import { useHospital } from '@/components/hospital/HospitalContext'
import { HOSPITAL_CARD } from '@/components/hospital/StatTile'

interface Record_ {
  id: string
  triggered_at: string
  patient_name: string | null
  blood_group: string | null
  known_conditions: string | null
  registration_type: 'PRIMARY' | 'SECONDARY'
  outcome: 'PENDING' | 'ADMITTED' | 'CANCELLED'
  destination_label: string | null
  destination_kind: 'primary' | 'secondary' | 'nearby' | null
  eta_at_confirmation_minutes: number | null
}

const OUTCOME_STYLE: Record<string, string> = {
  ADMITTED: 'bg-[#cce9dd] text-[#0b7a5a]',
  CANCELLED: 'bg-neutral-200 text-neutral-600',
  PENDING: 'bg-[#ffe8c2] text-[#8a5a00]',
}

function destination(r: Record_): string {
  if (r.destination_kind === 'nearby') return 'Nearest Hospital (Off-Platform)'
  return r.destination_label ?? (r.outcome === 'PENDING' ? 'Pending' : '—')
}

/** Admission History (US-009): filterable, exportable, permanent. */
export default function HospitalHistoryPage() {
  const { hospital } = useHospital()
  const [filters, setFilters] = useState({ from: '', to: '', outcome: '', search: '' })
  const [records, setRecords] = useState<Record_[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const queryString = useCallback(() => {
    const p = new URLSearchParams()
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    if (filters.outcome) p.set('outcome', filters.outcome)
    if (filters.search.trim()) p.set('search', filters.search.trim())
    return p.toString()
  }, [filters])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/hospital/history?${queryString()}`)
    if (res.ok) {
      const data = await res.json()
      setRecords(data.records ?? [])
      setCount(data.count ?? 0)
    }
    setLoading(false)
  }, [queryString])

  useEffect(() => {
    if (!hospital) return
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [hospital, load])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#003366]">
          {hospital?.hospitalName ?? 'Your hospital'} — Admission History
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every QSOS emergency your hospital was alerted to. Records are permanent and are retained
          even after a patient changes hospital or deletes their account.
        </p>
      </header>

      <section className={`${HOSPITAL_CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-end gap-3 border-b border-neutral-100 px-6 py-4">
          <label className="text-xs text-neutral-500">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="mt-1 block h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800"
            />
          </label>
          <label className="text-xs text-neutral-500">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="mt-1 block h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800"
            />
          </label>
          <label className="text-xs text-neutral-500">
            Outcome
            <select
              value={filters.outcome}
              onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))}
              className="mt-1 block h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800"
            >
              <option value="">All</option>
              <option value="ADMITTED">Admitted</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>
          <label className="text-xs text-neutral-500">
            Patient
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search by name"
              className="mt-1 block h-9 w-44 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800"
            />
          </label>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-neutral-500">{count} records</span>
            <a
              href={`/api/hospital/history/export?${queryString()}`}
              className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#002347]"
            >
              Export CSV
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-6 py-3 font-medium">Date &amp; Time</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Outcome</th>
                <th className="px-6 py-3 font-medium">Destination</th>
                <th className="px-6 py-3 font-medium">ETA at Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-neutral-400">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-neutral-400">No records match these filters.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60">
                    <td className="px-6 py-3 whitespace-nowrap">
                      {new Date(r.triggered_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-neutral-800">{r.patient_name ?? 'Unknown'}</span>
                      <span className="block text-xs text-neutral-400">
                        {[r.blood_group, r.known_conditions].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-semibold text-neutral-600">{r.registration_type}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OUTCOME_STYLE[r.outcome]}`}>
                        {r.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-neutral-700">{destination(r)}</td>
                    <td className="px-6 py-3 text-neutral-700">
                      {/* Blank for an off-platform destination: no ETA was ever quoted. */}
                      {r.destination_kind === 'nearby' || r.eta_at_confirmation_minutes == null
                        ? '—'
                        : `${r.eta_at_confirmation_minutes} min`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
