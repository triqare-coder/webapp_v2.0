import { describe, it, expect } from 'vitest'
import {
  buildJourney,
  closedAt,
  currentStage,
  effectiveOutcome,
  formatDuration,
  isLiveAlert,
  parseStatusHistory,
  type JourneyAlert,
  type JourneySos,
} from '../journey'

// Shapes taken from live SOS bcd4e198 (admitted at the Triqare test hospital).
const history = [
  { status: 'SOS Triggered', timestamp: '2026-09-25T15:53:40.576Z', actor: 'patient' },
  { status: 'Driver En Route', timestamp: '2026-09-25T15:53:45.143Z' },
  { status: 'Transport Arrived', timestamp: '2026-09-25T15:53:54.496Z' },
  {
    status: 'User Picked Up',
    timestamp: '2026-09-25T15:54:28.130Z',
    hospitalDetails: { hospitalId: 'h1', name: 'Triqare Test Hospital', kind: 'primary' },
  },
  { status: 'Arrived at Hospital', timestamp: '2026-09-25T15:54:30.482Z' },
]

const admitted: JourneyAlert = {
  status: 'CONFIRMED_INCOMING',
  outcome: 'ADMITTED',
  triggered_at: '2026-09-25T15:53:40.576Z',
  confirmed_at: '2026-09-25T15:54:27.404Z',
  cancelled_at: null,
  updated_at: '2026-09-25T15:54:29.752Z',
  destination_label: 'Triqare Test Hospital',
  destination_kind: 'primary',
}
// status_history is stored as a JSON string on live.
const sos: JourneySos = { status: 'Arrived at Hospital', status_history: JSON.stringify(history) }

describe('status_history parsing', () => {
  it('accepts the JSON-string shape and the array shape', () => {
    expect(parseStatusHistory(JSON.stringify(history))).toHaveLength(5)
    expect(parseStatusHistory(history)).toHaveLength(5)
  })
  it('degrades to empty on garbage', () => {
    expect(parseStatusHistory('not json')).toEqual([])
    expect(parseStatusHistory(null)).toEqual([])
  })
})

describe('Patients tab vs Admission History', () => {
  it('an admitted alert is closed even though its status stays CONFIRMED_INCOMING', () => {
    expect(isLiveAlert(admitted)).toBe(false)
    expect(effectiveOutcome(admitted)).toBe('ADMITTED')
  })
  it('a stand-down is closed for this hospital while the SOS itself continues', () => {
    const stoodDown = { ...admitted, status: 'CANCELLED' as const, outcome: 'PENDING' as const }
    expect(isLiveAlert(stoodDown)).toBe(false)
    expect(effectiveOutcome(stoodDown)).toBe('CANCELLED')
  })
  it('pending and confirmed-incoming alerts are live', () => {
    expect(isLiveAlert({ status: 'PENDING', outcome: 'PENDING' })).toBe(true)
    expect(isLiveAlert({ status: 'CONFIRMED_INCOMING', outcome: 'PENDING' })).toBe(true)
  })
})

describe('closed time (history Date & Time)', () => {
  it('uses the arrival for an admission, not the SOS trigger', () => {
    expect(closedAt(admitted, sos)).toBe('2026-09-25T15:54:30.482Z')
  })
  it('uses the stand-down moment for a cancellation', () => {
    const stoodDown = { ...admitted, status: 'CANCELLED' as const, outcome: 'CANCELLED' as const, cancelled_at: '2026-09-25T15:54:28.500Z' }
    expect(closedAt(stoodDown, sos)).toBe('2026-09-25T15:54:28.500Z')
  })
  it('falls back to the alert when the SOS row was deleted with the account', () => {
    expect(closedAt(admitted, null)).toBe('2026-09-25T15:54:29.752Z')
  })
  it('is null while live', () => {
    expect(closedAt({ ...admitted, outcome: 'PENDING' }, sos)).toBeNull()
  })
})

describe('live stage', () => {
  const live = { ...admitted, status: 'PENDING' as const, outcome: 'PENDING' as const, confirmed_at: null }
  it('follows the driver workflow before a destination is chosen', () => {
    expect(currentStage(live, { status: 'SOS Triggered', status_history: history.slice(0, 1) }).key).toBe('TRIGGERED')
    expect(currentStage(live, { status: 'Driver En Route', status_history: history.slice(0, 2) }).key).toBe('AMBULANCE_EN_ROUTE')
    expect(currentStage(live, { status: 'Transport Arrived', status_history: history.slice(0, 3) }).key).toBe('AMBULANCE_AT_PATIENT')
  })
  it('is "en route to your hospital" once confirmed, not admitted', () => {
    const confirmed = { ...admitted, outcome: 'PENDING' as const }
    const stage = currentStage(confirmed, { status: 'User Picked Up', status_history: history.slice(0, 4) })
    expect(stage.key).toBe('EN_ROUTE_TO_HOSPITAL')
    expect(stage.at).toBe('2026-09-25T15:54:28.130Z')
  })
})

describe('journey', () => {
  it('orders every stage and hospital event with elapsed times', () => {
    const { steps, summary } = buildJourney(admitted, sos)
    expect(steps[0].label).toBe('SOS triggered')
    expect(steps.at(-1)!.label).toBe('Arrived at your hospital — admitted')
    expect(steps.some((s) => s.hospital && s.label === 'Confirmed incoming to your hospital')).toBe(true)
    expect(summary.totalMs).toBe(49_906)
    expect(summary.responseMs).toBe(13_920)
    expect(summary.transportMs).toBe(2_352)
  })
  it('stops at the stand-down: the rest of the trip is another hospital\'s', () => {
    const stoodDown = {
      ...admitted,
      status: 'CANCELLED' as const,
      outcome: 'CANCELLED' as const,
      confirmed_at: null,
      cancelled_at: '2026-09-25T15:54:28.000Z',
      destination_label: 'Silver Crest Hospital',
    }
    const { steps } = buildJourney(stoodDown, sos)
    expect(steps.some((s) => s.label === 'Stood down')).toBe(true)
    // Picked up at :28.130 by the phone, stood down at :28.000 by the database:
    // skew must not drop the pickup.
    expect(steps.some((s) => s.label === 'Patient picked up')).toBe(true)
    expect(steps.some((s) => s.label.startsWith('Arrived'))).toBe(false)
  })
  it('still renders for a deleted account from the alert alone', () => {
    const { steps } = buildJourney(admitted, null)
    expect(steps.map((s) => s.label)).toEqual([
      'SOS triggered',
      'Your hospital was alerted',
      'Confirmed incoming to your hospital',
      'Arrived at your hospital — admitted',
    ])
  })
})

describe('formatDuration', () => {
  it('reads naturally at every scale', () => {
    expect(formatDuration(38_000)).toBe('38s')
    expect(formatDuration(245_000)).toBe('4m 05s')
    expect(formatDuration(4_320_000)).toBe('1h 12m')
    expect(formatDuration(null)).toBe('—')
  })
})
