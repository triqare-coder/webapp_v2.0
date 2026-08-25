'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const VOLUME_KEY = 'qsos.hospital.alertVolume'
/**
 * The alert is a patient-safety signal, so the volume control has a floor: it
 * can be turned down, but not off. "Cannot be fully muted by default" is a
 * requirement, not a preference.
 */
export const MIN_VOLUME = 0.15
const DEFAULT_VOLUME = 0.6

function readStoredVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY)
    const parsed = raw == null ? NaN : Number.parseFloat(raw)
    if (!Number.isFinite(parsed)) return DEFAULT_VOLUME
    return Math.min(1, Math.max(MIN_VOLUME, parsed))
  } catch {
    // Private windows and blocked site data both throw here.
    return DEFAULT_VOLUME
  }
}

/**
 * A looping two-tone siren for the SOS beacon.
 *
 * THE BROWSER CONSTRAINT: an AudioContext created without a user gesture starts
 * `suspended`, and every browser enforces this. A dashboard sitting untouched on
 * a ward terminal therefore CANNOT play a sound on its own -- which is exactly
 * the situation the alert exists for. There is no way around it, so this hook
 * reports `blocked` and the UI shows a visible "enable alert sound" prompt.
 * Failing silently would be far worse than nagging.
 *
 * Synthesised rather than an audio file: no asset to 404, no decode latency, and
 * it starts on the first frame of the alert.
 */
export function useSiren() {
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const [blocked, setBlocked] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => setVolumeState(readStoredVolume()), [])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(MIN_VOLUME, v))
    setVolumeState(clamped)
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped))
    } catch {
      /* storage unavailable; the volume still applies for this session */
    }
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setValueAtTime(clamped, ctxRef.current.currentTime)
    }
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    try {
      oscRef.current?.stop()
    } catch {
      /* already stopped */
    }
    oscRef.current = null
    gainRef.current = null
  }, [])

  const start = useCallback(() => {
    if (oscRef.current) return
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = ctxRef.current ?? new Ctor()
      ctxRef.current = ctx

      if (ctx.state === 'suspended') {
        // Only a user gesture can resume it. Try, and surface the failure.
        void ctx.resume().catch(() => undefined)
        if (ctx.state === 'suspended') setBlocked(true)
      }

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(760, ctx.currentTime)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()

      oscRef.current = osc
      gainRef.current = gain

      // Two-tone alternation: a steady tone reads as a device fault, a swept
      // one reads as an alarm.
      let high = false
      timerRef.current = window.setInterval(() => {
        if (!ctxRef.current || !oscRef.current) return
        high = !high
        oscRef.current.frequency.setValueAtTime(high ? 980 : 760, ctxRef.current.currentTime)
      }, 600)

      if (ctx.state === 'running') setBlocked(false)
    } catch {
      setBlocked(true)
    }
  }, [volume])

  /** Call from a click handler: the gesture is what lets audio play at all. */
  const unlock = useCallback(async () => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = ctxRef.current ?? new Ctor()
      ctxRef.current = ctx
      await ctx.resume()
      setBlocked(ctx.state !== 'running')
    } catch {
      setBlocked(true)
    }
  }, [])

  useEffect(() => stop, [stop])

  return { start, stop, unlock, volume, setVolume, blocked }
}
