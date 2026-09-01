import { describe, expect, it } from 'vitest'
import {
  formatLastSeen,
  getDriverPresence,
  PRESENCE_STALE_MINUTES,
  summarisePresence,
} from '@/lib/driverPresence'

const NOW = new Date('2026-09-01T12:00:00.000Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60000).toISOString()

describe('getDriverPresence', () => {
  it('calls a driver online when they are available and still reporting', () => {
    const r = getDriverPresence({ status: 'available', lastUpdatedAt: minutesAgo(2) }, NOW)
    expect(r.presence).toBe('online')
    expect(r.minutesSinceHeartbeat).toBe(2)
  })

  it('downgrades a silent "available" to stale rather than offline', () => {
    // A force-killed or backgrounded app leaves drivers.status on 'available'.
    // Reporting that as Online is the over-report the dashboards used to make;
    // reporting it as Offline would tell dispatch to skip a driver who is still
    // on duty and still reachable by push.
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(PRESENCE_STALE_MINUTES + 1) },
      NOW,
    )
    expect(r.presence).toBe('stale')
  })

  it('treats the stale threshold itself as still online', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(PRESENCE_STALE_MINUTES) },
      NOW,
    )
    expect(r.presence).toBe('online')
  })

  it('reports a driver who never sent a position as stale, not online', () => {
    expect(getDriverPresence({ status: 'available', lastUpdatedAt: null }, NOW).presence).toBe(
      'stale',
    )
  })

  it('keeps an assigned driver on-trip even when the heartbeat has gone quiet', () => {
    const r = getDriverPresence(
      { status: 'available', currentRequestId: 'req-1', lastUpdatedAt: minutesAgo(600) },
      NOW,
    )
    expect(r.presence).toBe('on_trip')
  })

  it.each(['assigned', 'on_trip'])('maps drivers.status=%s to on-trip', (status) => {
    expect(getDriverPresence({ status, lastUpdatedAt: minutesAgo(1) }, NOW).presence).toBe('on_trip')
  })

  it('is offline for an inactive driver and for a user with no drivers row', () => {
    expect(getDriverPresence({ status: 'inactive', lastUpdatedAt: minutesAgo(1) }, NOW).presence).toBe(
      'offline',
    )
    expect(getDriverPresence({}, NOW).presence).toBe('offline')
  })

  it('ignores an unparseable heartbeat instead of counting it as fresh', () => {
    const r = getDriverPresence({ status: 'available', lastUpdatedAt: 'not-a-date' }, NOW)
    expect(r.minutesSinceHeartbeat).toBeNull()
    expect(r.presence).toBe('stale')
  })
})

describe('formatLastSeen', () => {
  it('renders the ages the driver tables show', () => {
    expect(formatLastSeen(null)).toBe('never')
    expect(formatLastSeen(0)).toBe('just now')
    expect(formatLastSeen(5)).toBe('5 min ago')
    expect(formatLastSeen(90)).toBe('1 hr ago')
    expect(formatLastSeen(60 * 5)).toBe('5 hrs ago')
    expect(formatLastSeen(60 * 24 * 3)).toBe('3 days ago')
  })
})

describe('summarisePresence', () => {
  it('counts each bucket for the dashboard tiles', () => {
    const counts = summarisePresence(
      [
        { status: 'available', lastUpdatedAt: minutesAgo(1) },
        { status: 'available', lastUpdatedAt: minutesAgo(1) },
        { status: 'available', lastUpdatedAt: minutesAgo(999) },
        { status: 'on_trip', lastUpdatedAt: minutesAgo(1) },
        { status: 'inactive', lastUpdatedAt: minutesAgo(1) },
      ],
      NOW,
    )
    expect(counts).toEqual({ online: 2, on_trip: 1, stale: 1, offline: 1, total: 5 })
  })
})

describe('labels', () => {
  it('never calls a driver who is still on duty "offline"', () => {
    // The only route to 'offline' is the driver's own Go Offline / sign-out,
    // which sets drivers.status = 'inactive'.
    const silentButAvailable = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(60 * 24) },
      NOW,
    )
    expect(silentButAvailable.presence).toBe('stale')
    expect(silentButAvailable.label).toBe('On duty')
  })
})
