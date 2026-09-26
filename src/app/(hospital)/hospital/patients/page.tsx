'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useHospital } from '@/components/hospital/HospitalContext'
import { ActiveEmergencies } from '@/components/hospital/ActiveEmergencies'

function Emergencies() {
  // ?alert= comes from a clicked notification: open that emergency's journey.
  return <ActiveEmergencies focusAlertId={useSearchParams().get('alert')} />
}

/**
 * The Patients tab: patients with an SOS in progress right now. The full
 * Registered Patient List (US-003) is on Home; closed SOS records are in
 * Admission History.
 */
export default function HospitalPatientsPage() {
  const { hospital } = useHospital()
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#003366]">
          {hospital?.hospitalName ?? 'Your hospital'} — Active SOS Patients
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Emergencies that are pending or confirmed incoming to your hospital, with live stage and ETA.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <Emergencies />
      </Suspense>
    </div>
  )
}
