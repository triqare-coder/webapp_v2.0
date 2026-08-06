import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * An email change has to reach auth.users, not just public.users — the profile
 * row is only what the dashboard displays, the credential is the auth row.
 *
 * The case these pin is the one that fails quietly: a record with no linked auth
 * account has no credential to move, so the login update is skipped. That is the
 * correct thing to do, but reporting plain success afterwards is not — it leaves
 * an admin believing the sign-in address changed when nothing about signing in
 * did. Linkage is currently 59/60 on live, so this is a latent path, not a
 * common one; it is exactly the kind that rots unnoticed without a test.
 */

const captured: {
  update?: Record<string, unknown>
  authUpdate?: { id: string; attrs: Record<string, unknown> }
} = {}

let currentRow: { email: string; auth_user_id: string | null } = {
  email: 'old@example.com',
  auth_user_id: 'auth-1',
}
let authError: { message: string } | null = null

// userService builds its client at module load via createServerClient(), so the
// factory is what has to be mocked — importing the module for real would demand
// live Supabase env vars.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: currentRow, error: null }) }),
      }),
      update: (payload: Record<string, unknown>) => {
        captured.update = payload
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'user-1', ...payload }, error: null }),
            }),
          }),
        }
      },
    }),
    auth: {
      admin: {
        updateUserById: async (id: string, attrs: Record<string, unknown>) => {
          captured.authUpdate = { id, attrs }
          return { error: authError }
        },
      },
    },
  }),
}))

const { UserService } = await import('../userService')

beforeEach(() => {
  captured.update = undefined
  captured.authUpdate = undefined
  currentRow = { email: 'old@example.com', auth_user_id: 'auth-1' }
  authError = null
})

describe('UserService.updateUser email changes', () => {
  it('moves the login when the record has a linked auth account', async () => {
    const result = await UserService.updateUser('user-1', { email: 'New@Example.com' } as never)

    expect(captured.authUpdate?.id).toBe('auth-1')
    expect(captured.authUpdate?.attrs.email).toBe('new@example.com')
    expect(captured.authUpdate?.attrs.email_confirm).toBe(true)
    expect(captured.update?.email).toBe('new@example.com')
    expect(result.error).toBeNull()
    expect(result.warning).toBeUndefined()
  })

  it('warns instead of reporting a clean success when no login is linked', async () => {
    currentRow = { email: 'old@example.com', auth_user_id: null }

    const result = await UserService.updateUser('user-1', { email: 'new@example.com' } as never)

    expect(captured.authUpdate).toBeUndefined() // nothing to move
    expect(captured.update?.email).toBe('new@example.com') // profile still updated
    expect(result.error).toBeNull()
    expect(result.warning).toMatch(/no linked login/i)
  })

  it('leaves the profile row untouched when GoTrue rejects the address', async () => {
    authError = { message: 'A user with this email address has already been registered' }

    const result = await UserService.updateUser('user-1', { email: 'taken@example.com' } as never)

    expect(result.error).toMatch(/Could not change the login email/)
    expect(captured.update).toBeUndefined() // never reached the profile write
    expect(result.data).toBeNull()
  })

  it('does not touch auth when the address is unchanged', async () => {
    const result = await UserService.updateUser('user-1', { email: 'OLD@example.com' } as never)

    expect(captured.authUpdate).toBeUndefined()
    expect(result.warning).toBeUndefined()
    expect(result.error).toBeNull()
  })
})
