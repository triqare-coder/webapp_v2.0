'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface HospitalIdentity {
  hospitalId: string
  hospitalName: string
  adminEmail: string
}

interface HospitalContextValue {
  hospital: HospitalIdentity | null
  loading: boolean
  error: string | null
}

const HospitalCtx = createContext<HospitalContextValue>({
  hospital: null,
  loading: true,
  error: null,
})

/**
 * The signed-in admin's hospital, resolved once for the whole dashboard.
 *
 * The hospital id comes from the SERVER (/api/hospital/me), derived from the
 * session -- never from the URL or from client state. Every hospital-scoped
 * query keys off this, so there is no request shape in which a client can name
 * a different hospital.
 */
export function HospitalProvider({ children }: { children: ReactNode }) {
  const [hospital, setHospital] = useState<HospitalIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/hospital/me')
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error ?? 'Could not load your hospital.')
        } else {
          setHospital(data)
        }
      } catch {
        if (!cancelled) setError('Could not load your hospital.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return <HospitalCtx.Provider value={{ hospital, loading, error }}>{children}</HospitalCtx.Provider>
}

export function useHospital() {
  return useContext(HospitalCtx)
}
