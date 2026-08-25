'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  REALTIME_SUBSCRIBE_STATES,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/supabase/browser'

type Table = 'hospital_sos_alerts' | 'hospital_patient_registrations' | 'hospital_notifications'

interface Options {
  /** Called on any change to the table for this hospital. */
  onChange?: (payload: { eventType: string; new: Record<string, unknown> | null }) => void
  enabled?: boolean
}

/**
 * Subscribe to one hospital-scoped table.
 *
 * Two things here differ from the older realtime hooks in this codebase, on
 * purpose:
 *
 * 1. It uses getBrowserSupabase() (the session-bound client), not the anon
 *    singleton in @/lib/supabase that every existing realtime hook imports.
 *    The hospital_* tables have RLS on and grant anon nothing, so an anon
 *    channel would receive silence -- and silence is indistinguishable from
 *    "no emergencies", which is the worst possible failure for this product.
 *
 * 2. Reconnection backs off exponentially (1s -> 30s) rather than retrying on a
 *    flat timer, per the availability requirement.
 *
 * The server-side filter is defence in depth. RLS already restricts rows to the
 * caller's hospital; the filter keeps the socket quiet rather than being the
 * thing that enforces isolation.
 */
export function useHospitalRealtime(table: Table, hospitalId: string | null, options: Options = {}) {
  const { onChange, enabled = true } = options
  const [connected, setConnected] = useState(false)
  const handler = useRef(onChange)
  handler.current = onChange

  useEffect(() => {
    if (!enabled || !hospitalId) return

    const supabase = getBrowserSupabase()
    let channel: RealtimeChannel | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let disposed = false

    const connect = () => {
      if (disposed) return
      channel = supabase
        .channel(`${table}:${hospitalId}:${attempt}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `hospital_id=eq.${hospitalId}` },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            handler.current?.({
              eventType: payload.eventType,
              new: (payload.new as Record<string, unknown>) ?? null,
            })
          },
        )
        .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
          if (disposed) return
          if (status === 'SUBSCRIBED') {
            setConnected(true)
            attempt = 0
            return
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnected(false)
            if (retry) return
            const delay = Math.min(1000 * 2 ** attempt, 30_000)
            attempt += 1
            retry = setTimeout(() => {
              retry = null
              if (channel) supabase.removeChannel(channel)
              connect()
            }, delay)
          }
        })
    }

    connect()

    return () => {
      disposed = true
      if (retry) clearTimeout(retry)
      if (channel) supabase.removeChannel(channel)
      setConnected(false)
    }
  }, [table, hospitalId, enabled])

  return { connected }
}
