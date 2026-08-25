'use client'

import { useCallback, useEffect, useState } from 'react'
import { useHospital } from '@/components/hospital/HospitalContext'
import { useHospitalRealtime } from '@/hooks/useHospitalRealtime'
import { PatientList } from '@/components/hospital/PatientList'
import { StatTile } from '@/components/hospital/StatTile'

interface Kpis {
  livesSaved: number
  primaryPatients: number
  secondaryPatients: number
}

/**
 * Dashboard home (US-002). The heading is the hospital's own name, so the page
 * reads as the hospital's product rather than a generic portal.
 */
export default function HospitalHomePage() {
  const { hospital, loading: hospitalLoading, error } = useHospital()
  const [kpis, setKpis] = useState<Kpis>({ livesSaved: 0, primaryPatients: 0, secondaryPatients: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/hospital/kpis')
    if (res.ok) setKpis(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (hospital) void load()
  }, [hospital, load])

  // Tiles move the moment a registration or an admission does, with no refresh.
  useHospitalRealtime('hospital_patient_registrations', hospital?.hospitalId ?? null, {
    onChange: () => void load(),
  })
  useHospitalRealtime('hospital_sos_alerts', hospital?.hospitalId ?? null, {
    onChange: () => void load(),
  })

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-[#cc3333]">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#003366]">
          {hospitalLoading ? 'Loading…' : `${hospital?.hospitalName} — QSOS Hospital Dashboard`}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Live emergency alerts and your registered patients.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile
          label="Total Lives Saved"
          value={kpis.livesSaved}
          hint="Patients admitted here through QSOS"
          tint="red"
          loading={loading}
        />
        <StatTile
          label="Primary Patients"
          value={kpis.primaryPatients}
          hint="Active registrations"
          tint="navy"
          loading={loading}
        />
        <StatTile
          label="Secondary Patients"
          value={kpis.secondaryPatients}
          hint="Active registrations"
          tint="emerald"
          loading={loading}
        />
      </div>

      <PatientList showSearch={false} limit={10} />
    </div>
  )
}
