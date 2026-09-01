import { describe, expect, it } from 'vitest'
import { firstEmbedded } from '@/lib/postgrestEmbed'

// The ER Driver Status page read `user.drivers?.[0]` for every driver. PostgREST
// returns that embed as a single OBJECT (users -> drivers is to-one, keyed by
// drivers.user_id), so the index was always undefined and the whole fleet
// rendered as offline, unlicensed and company-less — no error, just defaults.
describe('firstEmbedded', () => {
  it('returns the row when PostgREST sends a to-one embed as an object', () => {
    const row = { user_id: 'd1', status: 'available' }
    expect(firstEmbedded(row)).toBe(row)
  })

  it('returns the first row when it sends an array instead', () => {
    const row = { user_id: 'd1', status: 'available' }
    expect(firstEmbedded([row])).toBe(row)
  })

  it('is null for the shapes that mean "no related row"', () => {
    expect(firstEmbedded(null)).toBeNull()
    expect(firstEmbedded(undefined)).toBeNull()
    expect(firstEmbedded([])).toBeNull()
  })
})
