import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, getAuthedUser } from '@/lib/supabase/server'

/**
 * Patient guard for routes the MOBILE APP calls as well as the web portal.
 * SERVER-ONLY.
 *
 * The portal authenticates with the Supabase session cookie; the app has no
 * cookie and sends its Supabase access token as `Authorization: Bearer <jwt>`.
 * auth.getUser(jwt) validates the token with the Auth server (signature, expiry,
 * revocation), so the bearer path is as strong as the cookie path.
 *
 * Routes using this must be listed in the middleware's PUBLIC_PREFIXES, or the
 * cookie-less app request is redirected to /sign-in before it gets here.
 */
export type PatientAppUser = {
  id: string
  role: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

type PatientGuardResult =
  | { appUser: PatientAppUser; error?: undefined }
  | { appUser?: undefined; error: NextResponse }

export async function requirePatient(request: NextRequest): Promise<PatientGuardResult> {
  let appUser = (await getAuthedUser()).appUser as PatientAppUser | null

  if (!appUser) {
    const authz = request.headers.get('authorization') ?? ''
    const jwt = authz.startsWith('Bearer ') ? authz.slice(7).trim() : ''
    if (jwt) {
      const admin = createServerClient()
      const { data } = await admin.auth.getUser(jwt)
      if (data.user) {
        const { data: row } = await admin.from('users').select('*').eq('auth_user_id', data.user.id).maybeSingle()
        appUser = row
      }
    }
  }

  if (!appUser) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (appUser.role !== 'patient') {
    return { error: NextResponse.json({ error: 'Forbidden - insufficient role' }, { status: 403 }) }
  }
  return { appUser }
}
