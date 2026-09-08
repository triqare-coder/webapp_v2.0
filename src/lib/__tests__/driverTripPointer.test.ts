import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveTripPointers } from '@/lib/driverTripPointer'

type Result = { data: unknown; error: { message: string } | null }

const client = (result: Result) => {
  const inFn = vi.fn().mockResolvedValue(result)
  return {
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ in: inFn }) }),
    inFn,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('resolveTripPointers', () => {
  it('says nothing about drivers with no pointer, and never queries for them', async () => {
    const c = client({ data: [], error: null })
    const map = await resolveTripPointers(c, [
      { user_id: 'a', current_request_id: null },
      { user_id: 'b' },
    ])
    expect(map.size).toBe(0)
    expect(c.from).not.toHaveBeenCalled()
  })

  it('marks a pointer at a live request as live', async () => {
    const c = client({ data: [{ id: 'r1', status: 'Driver En Route' }], error: null })
    const map = await resolveTripPointers(c, [{ user_id: 'a', current_request_id: 'r1' }])
    expect(map.get('a')).toBe(true)
  })

  it('marks a pointer at a finished request as stale', async () => {
    // The live case: cancelled four days earlier, driver still pinned.
    const c = client({ data: [{ id: 'r1', status: 'Cancelled' }], error: null })
    const map = await resolveTripPointers(c, [{ user_id: 'a', current_request_id: 'r1' }])
    expect(map.get('a')).toBe(false)
  })

  it('treats a completed request as stale too', async () => {
    const c = client({ data: [{ id: 'r1', status: 'Arrived at Hospital' }], error: null })
    const map = await resolveTripPointers(c, [{ user_id: 'a', current_request_id: 'r1' }])
    expect(map.get('a')).toBe(false)
  })

  it('treats a pointer at a request that no longer exists as stale', async () => {
    const c = client({ data: [], error: null })
    const map = await resolveTripPointers(c, [{ user_id: 'a', current_request_id: 'gone' }])
    expect(map.get('a')).toBe(false)
  })

  it('asks once for a request two drivers share', async () => {
    const c = client({ data: [{ id: 'r1', status: 'Cancelled' }], error: null })
    const map = await resolveTripPointers(c, [
      { user_id: 'a', current_request_id: 'r1' },
      { user_id: 'b', current_request_id: 'r1' },
    ])
    expect(c.inFn).toHaveBeenCalledWith('id', ['r1'])
    expect(map.get('a')).toBe(false)
    expect(map.get('b')).toBe(false)
  })

  // Fail in the direction that cannot hide a real emergency.
  it('leaves every pointer TRUSTED when the lookup fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = client({ data: null, error: { message: 'timeout' } })
    const map = await resolveTripPointers(c, [{ user_id: 'a', current_request_id: 'r1' }])
    // Empty map => getDriverPresence sees undefined => believes the pointer.
    expect(map.size).toBe(0)
  })
})
