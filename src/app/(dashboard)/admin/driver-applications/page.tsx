'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, History, Download } from 'lucide-react'

type Status = 'pending' | 'approved' | 'rejected'

interface PriorSummary {
  reference_number: string
  created_at: string
  status: Status
  rejection_reason: string | null
  reviewed_at: string | null
}

interface ApplicationListItem {
  id: string
  reference_number: string
  full_name: string
  phone: string
  email: string
  vehicle_type: string
  aadhaar_last4: string
  license_last4: string
  status: Status
  created_at: string
  reviewed_at: string | null
  reapplication: boolean
  priors: PriorSummary[]
}

const FILTERS: { label: string; value: Status | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  }
  return <Badge className={styles[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}

export default function DriverApplicationsPage() {
  const [filter, setFilter] = useState<Status | 'all'>('pending')
  const [items, setItems] = useState<ApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (status: Status | 'all') => {
    setLoading(true)
    setError(null)
    try {
      const qs = status === 'all' ? '' : `?status=${status}`
      const res = await fetch(`/api/admin/driver-applications${qs}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { applications: ApplicationListItem[] }
      setItems(data.applications)
    } catch {
      setError('Could not load applications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Driver Applications</h1>
          <p className="text-sm text-[#666666]">QSoS ambulance partner KYC applications</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f.value)}
                className={filter === f.value ? 'bg-[#003366] text-white hover:bg-[#002952]' : ''}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={`/api/admin/driver-applications/export${filter === 'all' ? '' : `?status=${filter}`}`}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </a>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#666666]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="py-16 text-center text-sm text-[#cc3333]">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#666666]">No applications found.</p>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <Card key={a.id} className="border-[#e6e6e6] transition-colors hover:border-[#ccd9e6]">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/driver-applications/${a.id}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#003366] hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {a.full_name}
                      </Link>
                      <StatusBadge status={a.status} />
                      {a.reapplication && (
                        <Badge className="border-[#ccd9e6] bg-[#ccd9e6]/40 text-[#003366]">
                          <History className="h-3 w-3" /> Reapplication ({a.priors.length})
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#666666]">
                      {a.reference_number} · {a.phone} · {a.email}
                    </p>
                    {a.reapplication && (
                      <p className="text-xs text-[#999999]">
                        Prior:{' '}
                        {a.priors
                          .map((p) => `${p.reference_number} (${p.status})`)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <span className="text-xs text-[#999999]">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/driver-applications/${a.id}`}>Review</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
