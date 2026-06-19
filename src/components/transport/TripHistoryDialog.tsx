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
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { downloadCSV } from '@/lib/exportUtils'

interface TripRow {
  id: string
  dateTime: string | null
  patientName: string
  destinationHospital: string
  outcome: string
  durationMinutes: number | null
}

interface Props {
  driverId: string
  driverName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OUTCOMES = ['All', 'Completed', 'Cancelled']

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cls =
    outcome === 'Completed'
      ? 'bg-green-100 text-green-800 border-green-200'
      : outcome === 'Cancelled'
        ? 'bg-red-100 text-red-800 border-red-200'
        : 'bg-gray-100 text-gray-700 border-gray-200'
  return <Badge className={cls}>{outcome}</Badge>
}

export function TripHistoryDialog({ driverId, driverName, open, onOpenChange }: Props) {
  const [rows, setRows] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(false)
  const [outcome, setOutcome] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (outcome !== 'All') p.set('outcome', outcome)
      if (from) p.set('from', new Date(from).toISOString())
      if (to) p.set('to', new Date(`${to}T23:59:59`).toISOString())
      const res = await fetch(`/api/transport/drivers/${driverId}/trip-history?${p.toString()}`)
      if (!res.ok) throw new Error('load failed')
      const data = (await res.json()) as { trips: TripRow[] }
      setRows(data.trips)
    } catch {
      toast.error('Could not load trip history')
    } finally {
      setLoading(false)
    }
  }, [driverId, outcome, from, to])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const exportCsv = () => {
    if (!rows.length) {
      toast.message('Nothing to export')
      return
    }
    downloadCSV(
      ['Date/Time', 'Patient', 'Destination Hospital', 'Outcome', 'Duration (min)'],
      rows.map((r) => [
        r.dateTime ? new Date(r.dateTime).toLocaleString() : '',
        r.patientName,
        r.destinationHospital,
        r.outcome,
        r.durationMinutes ?? '',
      ]),
      `trip-history-${driverName.replace(/\s+/g, '_')}.csv`,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Trip History — {driverName}</DialogTitle>
          <DialogDescription>Completed and cancelled trips for this driver.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#666666]">Outcome</label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                <th className="px-3 py-2">Date/Time</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-[#666666]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-[#666666]">No trips found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#f0f0f0]">
                    <td className="px-3 py-2">{r.dateTime ? new Date(r.dateTime).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2">{r.patientName}</td>
                    <td className="px-3 py-2">{r.destinationHospital}</td>
                    <td className="px-3 py-2"><OutcomeBadge outcome={r.outcome} /></td>
                    <td className="px-3 py-2">{r.durationMinutes != null ? `${r.durationMinutes} min` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
