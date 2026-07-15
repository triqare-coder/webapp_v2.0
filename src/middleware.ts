import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define route matchers for different role-based areas
const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isERTRoute = createRouteMatcher(['/erteam(.*)'])
const isTransportRoute = createRouteMatcher(['/transport(.*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/demo(.*)',
  '/register(.*)',
  // The registration form POSTs to /api/register/* during sign-up, BEFORE a Clerk
  // session exists (setActive runs only after email verification). Without this
  // entry the unauthenticated POST is redirected to /sign-in (200 HTML), so the DB
  // user/patient rows are never created even though the Clerk account was. These
  // handlers do not rely on auth() — they key off the caller-supplied clerkUserId —
  // so they must be reachable during the pre-session signup step.
  '/api/register(.*)',
  '/setup(.*)',
  '/mobile-app-required(.*)', // Allow access to mobile app redirect page
  '/test-mobile-redirect(.*)', // Allow access to test page
  '/api/webhooks(.*)',
  // The SOS push-dispatch webhook is called machine-to-machine by the Postgres
  // pg_net trigger, which has no Clerk session. Without this it is 307-redirected
  // to /sign-in and no push is ever sent. It is NOT unprotected: the handler
  // rejects any request whose bearer token != PUSH_DISPATCH_SECRET (503 if the
  // secret is unset, 401 on mismatch), so Clerk's user-session gate is simply the
  // wrong auth layer for it.
  '/api/push(.*)',
  // NOTE: /api/admin/* setup & migration endpoints (create-initial-user, users/sync,
  // migrate-users, auto-sync, migrate-to-user-records, create-user-records-table,
  // populate-user-records) were previously whitelisted as PUBLIC. That exposed
  // privileged bootstrap/migration actions (e.g. creating an admin user record) to
  // unauthenticated callers. They have been removed from the public list so they fall
  // through to the authentication gate below. (Full per-handler admin role assertion
  // should also be added inside each route handler.)
  '/api/sync-users(.*)',
  '/api/sync-clerk-to-tables(.*)',
  '/api/debug(.*)',
  '/api/auth/signin-direct(.*)',
  '/api/cron(.*)',
  '/api/announcements/active(.*)', // Public access for announcement banner
  '/api/seed(.*)', // Seed endpoints for test data
  '/api/users/locations(.*)', // Public access for map data (map needs this)
  '/api/erteam(.*)', // ERT team API endpoints
  '/api/transport-companies(.*)', // Transport companies API
  '/api/drivers(.*)', // Drivers API
  '/api/patients(.*)', // Patients API
  '/api/hospitals(.*)', // Hospitals API
  '/drivers', // Public QSoS driver landing page
  '/drivers/apply(.*)', // Public QSoS driver application form
  '/api/drivers/applications(.*)', // Public submit + document upload (also covered by /api/drivers(.*))
  '/test-users(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Allow test mode for transport API routes
  if (pathname.startsWith('/api/transport/') && req.nextUrl.searchParams.get('test') === 'true') {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // For authenticated users, we'll let the client-side RoleGuard handle role-based access
  // This middleware focuses on authentication, not authorization
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
