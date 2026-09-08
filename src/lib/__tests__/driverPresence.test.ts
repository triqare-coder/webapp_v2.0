import { describe, expect, it } from 'vitest'
import {
  describePresence,
  formatLastSeen,
  getDriverPresence,
  isDispatchable,
  PRESENCE_LABEL,
  PRESENCE_STALE_MINUTES,
  summarisePresence,
} from '@/lib/driverPresence'

const NOW = new Date('2026-09-01T12:00:00.000Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60000).toISOString()

// The four states, and the rule that produces each. The portal used to carry
// eleven words for these on screen and thirteen in code, which is how one driver
// read "Stale" on ER Team, "Duty unknown" on Admin and "Available" on the Admin
// driver list at the same moment.
describe('getDriverPresence', () => {
  it('is on duty when the driver is available and reachable', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(2), hasPushToken: true },
      NOW,
    )
    expect(r.presence).toBe('on_duty')
    expect(r.label).toBe('On Duty')
    expect(r.dispatchable).toBe(true)
    expect(r.minutesSinceHeartbeat).toBe(2)
  })

  it.each(['assigned', 'on_trip'])('maps drivers.status=%s to on-trip', (status) => {
    expect(getDriverPresence({ status, lastUpdatedAt: minutesAgo(1) }, NOW).presence).toBe('on_trip')
  })

  it('keeps a driver holding a live SOS on-trip even when the heartbeat is hours old', () => {
    const r = getDriverPresence(
      { status: 'available', currentRequestId: 'req-1', lastUpdatedAt: minutesAgo(600) },
      NOW,
    )
    expect(r.presence).toBe('on_trip')
  })

  it('is off duty for an inactive driver and for a user with no drivers row', () => {
    expect(
      getDriverPresence({ status: 'inactive', lastUpdatedAt: minutesAgo(1) }, NOW).presence,
    ).toBe('off_duty')
    expect(getDriverPresence({}, NOW).presence).toBe('off_duty')
  })
})

// The heartbeat is written by a FOREGROUND-only location watcher, so it stops
// when a driver pockets the phone. On live the freshest position fleet-wide was
// routinely 3+ hours old, so any state defined as "GPS in the last 10 minutes"
// read zero for the entire fleet, permanently. Live GPS is therefore a flag on a
// duty state, never a state — these cases pin that it cannot demote anyone.
describe('live GPS is a flag, not a state', () => {
  it('flags a fresh position without changing the duty state', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(2), hasPushToken: true },
      NOW,
    )
    expect(r.hasLiveGps).toBe(true)
    expect(r.presence).toBe('on_duty')
  })

  it('treats the threshold itself as live', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(PRESENCE_STALE_MINUTES), hasPushToken: true },
      NOW,
    )
    expect(r.hasLiveGps).toBe(true)
  })

  it('keeps a backgrounded driver ON DUTY and dispatchable with no live GPS', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(6 * 60), hasPushToken: true },
      NOW,
    )
    expect(r.presence).toBe('on_duty')
    expect(r.hasLiveGps).toBe(false)
    expect(r.dispatchable).toBe(true)
  })

  it('does not need a position at all to be on duty', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: null, hasPushToken: true },
      NOW,
    )
    expect(r.presence).toBe('on_duty')
    expect(r.minutesSinceHeartbeat).toBeNull()
    expect(r.hasLiveGps).toBe(false)
  })

  it('ignores an unparseable heartbeat instead of counting it as fresh', () => {
    const r = getDriverPresence(
      { status: 'available', lastUpdatedAt: 'not-a-date', hasPushToken: true },
      NOW,
    )
    expect(r.minutesSinceHeartbeat).toBeNull()
    expect(r.hasLiveGps).toBe(false)
    expect(r.presence).toBe('on_duty')
  })
})

// The live bug this encodes: device_tokens is not readable by the anon client, so
// the lookup failed, the failure was swallowed, and every driver whose `status`
// was still 'available' rendered a green "On duty" — including 5 with no
// registered device at all, who could never be paged.
describe('push reachability', () => {
  const base = { status: 'available', lastUpdatedAt: minutesAgo(999) } as const

  it('distinguishes no-device, failed-lookup and never-looked-up', () => {
    expect(getDriverPresence({ ...base, hasPushToken: true }, NOW).presence).toBe('on_duty')
    expect(getDriverPresence({ ...base, hasPushToken: false }, NOW).presence).toBe(
      'needs_attention',
    )
    expect(getDriverPresence({ ...base, hasPushToken: null }, NOW).presence).toBe(
      'needs_attention',
    )
    // undefined must mean "not looked up", not "no device" — otherwise a call
    // site with no access to the token data reports the whole fleet as broken.
    expect(getDriverPresence({ ...base }, NOW).presence).toBe('on_duty')
  })

  it('keeps the two Needs Attention reasons apart', () => {
    expect(getDriverPresence({ ...base, hasPushToken: false }, NOW).reason).toBe('no_device')
    expect(getDriverPresence({ ...base, hasPushToken: null }, NOW).reason).toBe('unchecked')
    // Nothing else carries a reason.
    expect(getDriverPresence({ ...base, hasPushToken: true }, NOW).reason).toBeNull()
    expect(getDriverPresence({ status: 'inactive' }, NOW).reason).toBeNull()
  })

  it('never counts a driver who needs attention as dispatchable', () => {
    for (const hasPushToken of [false, null]) {
      const r = getDriverPresence({ ...base, hasPushToken }, NOW)
      expect(r.dispatchable).toBe(false)
      expect(r.label).toBe('Needs Attention')
      expect(isDispatchable(r.presence)).toBe(false)
    }
  })

  it('never marks a driver holding a live SOS as needing attention', () => {
    // The driver is demonstrably working; a missing device row is a registration
    // problem, not grounds for hiding an in-progress trip.
    expect(
      getDriverPresence({ status: 'on_trip', currentRequestId: 'sos-1', hasPushToken: false }, NOW)
        .presence,
    ).toBe('on_trip')
    expect(getDriverPresence({ status: 'on_trip', hasPushToken: null }, NOW).presence).toBe(
      'on_trip',
    )
  })

  it('ignores the device for a driver who has gone off duty', () => {
    expect(getDriverPresence({ status: 'inactive', hasPushToken: false }, NOW).presence).toBe(
      'off_duty',
    )
  })
})

describe('describePresence', () => {
  it('tells the operator whose problem it is', () => {
    const noDevice = getDriverPresence(
      { status: 'available', hasPushToken: false, lastUpdatedAt: minutesAgo(5) },
      NOW,
    )
    expect(describePresence(noDevice)).toMatch(/sign in to the app again/i)

    const unchecked = getDriverPresence(
      { status: 'available', hasPushToken: null, lastUpdatedAt: minutesAgo(5) },
      NOW,
    )
    expect(describePresence(unchecked)).toMatch(/could not|cannot say/i)

    // An on-duty driver with no live position is normal, and the copy says so
    // rather than implying something is wrong.
    const backgrounded = getDriverPresence(
      { status: 'available', hasPushToken: true, lastUpdatedAt: minutesAgo(600) },
      NOW,
    )
    expect(describePresence(backgrounded)).toMatch(/normal/i)
  })
})

describe('labels', () => {
  it('never calls a driver who is still on duty "off duty"', () => {
    // The only route to off_duty is the driver's own Go Offline / sign-out,
    // which sets drivers.status = 'inactive'.
    const silentButAvailable = getDriverPresence(
      { status: 'available', lastUpdatedAt: minutesAgo(60 * 24), hasPushToken: true },
      NOW,
    )
    expect(silentButAvailable.presence).toBe('on_duty')
    expect(silentButAvailable.label).toBe('On Duty')
  })

  it('has exactly four labels, so no screen can invent a fifth', () => {
    expect(Object.keys(PRESENCE_LABEL).sort()).toEqual([
      'needs_attention',
      'off_duty',
      'on_duty',
      'on_trip',
    ])
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
        { status: 'available', lastUpdatedAt: minutesAgo(1), hasPushToken: true },
        { status: 'available', lastUpdatedAt: minutesAgo(999), hasPushToken: true },
        { status: 'available', lastUpdatedAt: minutesAgo(999), hasPushToken: false },
        { status: 'available', lastUpdatedAt: minutesAgo(999), hasPushToken: null },
        { status: 'on_trip', lastUpdatedAt: minutesAgo(1) },
        { status: 'inactive', lastUpdatedAt: minutesAgo(1) },
      ],
      NOW,
    )
    expect(counts).toEqual({
      on_trip: 1,
      on_duty: 2,
      needs_attention: 2,
      off_duty: 1,
      total: 6,
      dispatchable: 3,
      liveGps: 2,
      noDevice: 1,
      unchecked: 1,
    })
  })

  it('leads with cover, not with live GPS — the shape of the real fleet', () => {
    // Nobody in the foreground, most reachable: a live-GPS headline reads 0
    // while the honest answer to "how much cover do we have" is 2.
    const silent = minutesAgo(60)
    const counts = summarisePresence(
      [
        { status: 'available', lastUpdatedAt: silent, hasPushToken: true },
        { status: 'available', lastUpdatedAt: silent, hasPushToken: true },
        { status: 'available', lastUpdatedAt: silent, hasPushToken: false },
        { status: 'inactive', lastUpdatedAt: silent },
      ],
      NOW,
    )
    expect(counts.liveGps).toBe(0)
    expect(counts.dispatchable).toBe(2)
    expect(counts.needs_attention).toBe(1)
    expect(counts.off_duty).toBe(1)
  })

  it('does not pad the on-duty tile with drivers nobody could check', () => {
    const counts = summarisePresence(
      [
        { status: 'available', lastUpdatedAt: minutesAgo(999), hasPushToken: null },
        { status: 'available', lastUpdatedAt: minutesAgo(999), hasPushToken: null },
      ],
      NOW,
    )
    expect(counts.needs_attention).toBe(2)
    expect(counts.unchecked).toBe(2)
    expect(counts.on_duty).toBe(0)
    expect(counts.dispatchable).toBe(0)
  })
})
