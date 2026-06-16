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
  '/setup(.*)',
  '/mobile-app-required(.*)', // Allow access to mobile app redirect page
  '/test-mobile-redirect(.*)', // Allow access to test page
  '/api/webhooks(.*)',
  '/api/admin/create-initial-user(.*)',
  '/api/admin/users/sync(.*)',
  '/api/admin/migrate-users(.*)',
  '/api/admin/auto-sync(.*)',
  '/api/admin/migrate-to-user-records(.*)',
  '/api/admin/create-user-records-table(.*)',
  '/api/admin/populate-user-records(.*)',
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
