'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield } from 'lucide-react'
import { ClerkOrphansManager } from '@/components/admin/ClerkOrphansManager'

export default function AccountSyncPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">🔗 Account Sync</h1>
            <Badge className="bg-red-100 text-red-800">
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
          <p className="text-gray-600">
            Reconcile accounts between Clerk (auth) and the database. Drift here is what causes
            &ldquo;email already registered&rdquo; on sign-up while the user is missing from All Users.
          </p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      {/* Clerk exists, database missing (blocks re-registration) */}
      <ClerkOrphansManager />
    </div>
  )
}
