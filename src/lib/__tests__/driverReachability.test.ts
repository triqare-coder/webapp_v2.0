import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchPushReachability, fetchPushReachabilityViaApi } from '../driverReachability'

type Result = { data: unknown; error: { message: string; code?: string } | null }

/**
 * A client whose RPC answers `rpcResult` and whose device_tokens read answers
 * `tableResult`. Two paths, because the RPC is a migration that was written and
 * never applied: the fallback is what makes the dashboards correct today.
 */
const client = (rpcResult: Result, tableResult: Result = { data: [], error: null }) => {
  const tableIn = vi.fn().mockResolvedValue(tableResult)
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: tableIn }) }),
    }),
    tableIn,
  }
}

const MISSING_FN = {
  code: 'PGRST202',
  message:
    'Could not find the function public.driver_push_reachability(user_ids) in the schema cache',
}
const FORBIDDEN = { code: '42501', message: 'permission denied for table device_tokens' }

afterEach(() => vi.restoreAllMocks())

describe('fetchPushReachability', () => {
  it('returns the reachable ids the RPC reports', async () => {
    const c = client({ data: [{ user_id: 'a' }, { user_id: 'c' }], error: null })
    const reachable = await fetchPushReachability(c, ['a', 'b', 'c'])

    expect(c.rpc).toHaveBeenCalledWith('driver_push_reachability', {
      user_ids: ['a', 'b', 'c'],
    })
    expect(reachable).toEqual(new Set(['a', 'c']))
    // The RPC answered, so there is no reason to touch the table.
    expect(c.from).not.toHaveBeenCalled()
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

  it('treats a null payload as nobody reachable, not as a failure', async () => {
    const c = client({ data: null, error: null })
    expect(await fetchPushReachability(c, ['a'])).toEqual(new Set())
  })

  // The state production was actually in: the RPC migration was never applied,
  // so every dashboard asked, got PGRST202, and reported the whole on-duty fleet
  // as unverifiable — "On Duty Now = 1" against a truth of 12.
  it('falls back to the token table when the RPC does not exist', async () => {
    const c = client(
      { data: null, error: MISSING_FN },
      { data: [{ user_id: 'a' }], error: null },
    )
    expect(await fetchPushReachability(c, ['a', 'b'])).toEqual(new Set(['a']))
    expect(c.from).toHaveBeenCalledWith('device_tokens')
    expect(c.tableIn).toHaveBeenCalledWith('user_id', ['a', 'b'])
  })

  it('falls back when this client may not call the RPC', async () => {
    const c = client({ data: null, error: FORBIDDEN }, { data: [{ user_id: 'b' }], error: null })
    expect(await fetchPushReachability(c, ['a', 'b'])).toEqual(new Set(['b']))
  })

  it('reports an empty table read as "checked, nobody reachable"', async () => {
    // Not null: the fallback ran and found no devices, which is a real answer.
    const c = client({ data: null, error: MISSING_FN }, { data: [], error: null })
    expect(await fetchPushReachability(c, ['a'])).toEqual(new Set())
  })

  // The distinction the whole fix rests on: "checked, nobody is reachable" and
  // "could not check" must not collapse into the same value. Returning an empty
  // set on failure would paint the fleet red; returning undefined painted it
  // green, which is the bug this replaces.
  it('returns null — not an empty set — when BOTH paths are refused', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = client({ data: null, error: MISSING_FN }, { data: null, error: FORBIDDEN })
    expect(await fetchPushReachability(c, ['a'])).toBeNull()
  })

  it('does not retry the table on an error that is not about access', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = client({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } })
    expect(await fetchPushReachability(c, ['a'])).toBeNull()
    expect(c.from).not.toHaveBeenCalled()
  })
})

describe('fetchPushReachabilityViaApi', () => {
  const ok = (body: unknown) =>
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch

  it('asks our own server and returns the reachable set', async () => {
    const f = ok({ reachable: ['a'] })
    expect(await fetchPushReachabilityViaApi(['a', 'b'], f)).toEqual(new Set(['a']))
    expect(f).toHaveBeenCalledWith(
      '/api/drivers/reachability',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ user_ids: ['a', 'b'] }) }),
    )
  })

  it('does not call out when there is nobody to check', async () => {
    const f = ok({ reachable: [] })
    expect(await fetchPushReachabilityViaApi([], f)).toEqual(new Set())
    expect(f).not.toHaveBeenCalled()
  })

  it('returns null on a non-OK response so the badge says "could not check"', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch
    expect(await fetchPushReachabilityViaApi(['a'], f)).toBeNull()
  })

  it('returns null when the response is not the shape we expect', async () => {
    const f = ok({ oops: true })
    expect(await fetchPushReachabilityViaApi(['a'], f)).toBeNull()
  })

  it('returns null rather than throwing when the request fails outright', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    expect(await fetchPushReachabilityViaApi(['a'], f)).toBeNull()
  })
})
