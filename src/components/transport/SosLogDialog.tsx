'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Download, Info } from 'lucide-react'
import { toast } from 'sonner'
import { downloadCSV } from '@/lib/exportUtils'

interface LogRow {
  id: string
  timestamp: string | null
  action: string
  reason: string | null
  reassigned: boolean
  sosRequestId: string
}

interface Props {
  driverId: string
  driverName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTIONS = ['All', 'Cancelled', 'Rejected']

function ActionBadge({ action }: { action: string }) {
  const cls =
    action === 'Cancelled'
      ? 'bg-red-100 text-red-800 border-red-200'
      : action === 'Rejected'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : action === 'Accepted'
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-gray-100 text-gray-700 border-gray-200'
  return <Badge className={cls}>{action}</Badge>
}

export function SosLogDialog({ driverId, driverName, open, onOpenChange }: Props) {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (action !== 'All') p.set('action', action)
      if (from) p.set('from', new Date(from).toISOString())
      if (to) p.set('to', new Date(`${to}T23:59:59`).toISOString())
      const res = await fetch(`/api/transport/drivers/${driverId}/sos-log?${p.toString()}`)
      if (!res.ok) throw new Error('load failed')
      const data = (await res.json()) as { log: LogRow[] }
      setRows(data.log)
    } catch {
      toast.error('Could not load SOS log')
    } finally {
      setLoading(false)
    }
  }, [driverId, action, from, to])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const exportCsv = () => {
    if (!rows.length) {
      toast.message('Nothing to export')
      return
    }
    downloadCSV(
      ['Timestamp', 'Action', 'Reason', 'Reassigned', 'SOS Request'],
      rows.map((r) => [
        r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
        r.action,
        r.reason ?? '',
        r.reassigned ? 'Yes' : 'No',
        r.sosRequestId,
      ]),
      `sos-log-${driverName.replace(/\s+/g, '_')}.csv`,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>SOS Log — {driverName}</DialogTitle>
          <DialogDescription>
            Cancellations (actively declined) and rejections (offer timed out).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#666666]">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#666666]">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#666666]">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-md border border-[#e6e6e6]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#f5f5f5] text-left text-xs text-[#666666]">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Reassigned</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="py-10 text-center text-[#666666]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-[#666666]">No SOS activity recorded.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#f0f0f0]">
                    <td className="px-3 py-2">{r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2"><ActionBadge action={r.action} /></td>
                    <td className="px-3 py-2">{r.reason || '—'}</td>
                    <td className="px-3 py-2">{r.reassigned ? 'Yes' : 'No'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-[#999999]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Rejection/timeout rows appear once the dispatch flow logs driver offers to the assignment table.
        </p>
      </DialogContent>
    </Dialog>
  )
}
