import { auth, createClerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/types'

/**
 * Admin authorization guard for API routes. Mirrors the inline pattern used by
 * existing admin routes (e.g. src/app/api/admin/sync/route.ts): authenticate
 * via Clerk, then require publicMetadata.role === 'admin'. SERVER-ONLY.
 */

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

type AdminGuardResult = { userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }

export async function requireAdmin(): Promise<AdminGuardResult> {
  const { userId } = await auth()
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const user = await clerkClient.users.getUser(userId)
  const role = user.publicMetadata?.role as UserRole | undefined
  if (role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }) }
  }
  return { userId }
}
