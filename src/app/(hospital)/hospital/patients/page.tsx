'use client'

import { useHospital } from '@/components/hospital/HospitalContext'
import { PatientList } from '@/components/hospital/PatientList'

/** The full Registered Patient List (US-003). */
export default function HospitalPatientsPage() {
  const { hospital } = useHospital()
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#003366]">
          {hospital?.hospitalName ?? 'Your hospital'} — Registered Patients
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Patients who have chosen your hospital as their primary or secondary emergency hospital.
        </p>
      </header>
      <PatientList />
    </div>
  )
}
