'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useHospitalRealtime } from '@/hooks/useHospitalRealtime'
import { useHospital } from './HospitalContext'
import { HOSPITAL_CARD } from './StatTile'

interface Registration {
  id: string
  patient_id: string | null
  registration_type: 'PRIMARY' | 'SECONDARY'
  registered_since: string
  status: 'ACTIVE' | 'INACTIVE'
  patient_name: string | null
  blood_group: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The Registered Patient List (US-003).
 *
 * Active by default with a toggle for Inactive, which holds only patients who
 * DELETED their account. A patient who moved their preference elsewhere is gone
 * from both views: they are no longer this hospital's patient in any sense
 * (US-004), and showing them as "inactive" would misrepresent that.
 */
export function PatientList({ showSearch = true, limit }: { showSearch?: boolean; limit?: number }) {
  const { hospital } = useHospital()
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Registration[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status })
    if (search.trim()) params.set('search', search.trim())
    if (limit) params.set('limit', String(limit))
    const res = await fetch(`/api/hospital/patients?${params}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setRows(data.patients ?? [])
    setCount(data.count ?? 0)
    setLoading(false)
  }, [status, search, limit])

  useEffect(() => {
    if (!hospital) return
    const t = setTimeout(load, search ? 250 : 0) // debounce typing only
    return () => clearTimeout(t)
  }, [hospital, load, search])

  useHospitalRealtime('hospital_patient_registrations', hospital?.hospitalId ?? null, {
    onChange: () => void load(),
  })

  return (
    <section className={`${HOSPITAL_CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-6 py-4">
        <h2 className="text-base font-semibold text-[#003366]">Registered Patients</h2>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{count}</span>

        <div className="ml-auto flex items-center gap-3">
          {showSearch && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
              className="h-9 w-48 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-[#003366]"
            />
          )}
          <div className="flex rounded-lg border border-neutral-300 p-0.5">
            {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  status === s ? 'bg-[#003366] text-white' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {s === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="px-6 py-3 font-medium">Patient Name</th>
              <th className="px-6 py-3 font-medium">Registration Type</th>
              <th className="px-6 py-3 font-medium">Registered Since</th>
              <th className="px-6 py-3 font-medium">Blood Group</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-neutral-400">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-neutral-400">
                  {status === 'ACTIVE'
                    ? 'No patients have registered with your hospital yet.'
                    : 'No inactive patients.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-neutral-50 last:border-0 ${
                    r.status === 'INACTIVE' ? 'bg-neutral-50/60 text-neutral-400' : 'hover:bg-neutral-50/60'
                  }`}
                >
                  <td className="px-6 py-3 font-medium">{r.patient_name ?? 'Unknown'}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'INACTIVE'
                          ? 'bg-neutral-200 text-neutral-500'
                          : r.registration_type === 'PRIMARY'
                            ? 'bg-[#ccd9e6] text-[#003366]'
                            : 'bg-[#e6e0f5] text-[#5b3fa8]'
                      }`}
                    >
                      {r.registration_type}
                    </span>
                  </td>
                  <td className="px-6 py-3">{formatDate(r.registered_since)}</td>
                  <td className="px-6 py-3 font-semibold">{r.blood_group ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'ACTIVE' ? 'bg-[#cce9dd] text-[#0b7a5a]' : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {r.patient_id ? (
                      <Link href={`/hospital/patients/${r.patient_id}`} className="font-medium text-[#cc3333] hover:underline">
                        View Full Profile
                      </Link>
                    ) : (
                      // patient_id is nulled when the account is deleted; the
                      // snapshot in this row is all that is left of them.
                      <span className="text-xs text-neutral-400">Record only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
