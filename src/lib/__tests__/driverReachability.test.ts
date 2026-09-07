import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchPushReachability } from '../driverReachability'

const client = (result: { data: unknown; error: { message: string } | null }) => ({
  rpc: vi.fn().mockResolvedValue(result),
})

afterEach(() => vi.restoreAllMocks())

describe('fetchPushReachability', () => {
  it('returns the reachable ids the RPC reports', async () => {
    const c = client({ data: [{ user_id: 'a' }, { user_id: 'c' }], error: null })
    const reachable = await fetchPushReachability(c, ['a', 'b', 'c'])

    expect(c.rpc).toHaveBeenCalledWith('driver_push_reachability', {
      user_ids: ['a', 'b', 'c'],
    })
    expect(reachable).toEqual(new Set(['a', 'c']))
  })

  it('de-duplicates ids and drops blanks before asking', async () => {
    const c = client({ data: [], error: null })
    await fetchPushReachability(c, ['a', 'a', null, undefined, ''])
    expect(c.rpc).toHaveBeenCalledWith('driver_push_reachability', { user_ids: ['a'] })
  })

  it('does not call the RPC when there is nobody to check', async () => {
    const c = client({ data: [], error: null })
    expect(await fetchPushReachability(c, [])).toEqual(new Set())
    expect(c.rpc).not.toHaveBeenCalled()
  })

  // The distinction the whole fix rests on: "checked, nobody is reachable" and
  // "could not check" must not collapse into the same value. Returning an empty
  // set on failure would paint the fleet red; returning undefined painted it
  // green, which is the bug this replaces.
  it('returns null — not an empty set — when the lookup fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = client({ data: null, error: { message: 'permission denied for table device_tokens' } })
    expect(await fetchPushReachability(c, ['a'])).toBeNull()
  })

  it('treats a null payload as nobody reachable, not as a failure', async () => {
    const c = client({ data: null, error: null })
    expect(await fetchPushReachability(c, ['a'])).toEqual(new Set())
  })
})
