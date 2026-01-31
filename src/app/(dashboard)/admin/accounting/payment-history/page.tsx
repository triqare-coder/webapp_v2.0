'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { useBillingHistory, useBillingHistoryStats } from '@/hooks/useBillingHistory'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Receipt,
  Search,
  Eye,
  Download,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Users
} from 'lucide-react'
import Link from 'next/link'

export default function PaymentHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')

  // Dialog state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; patientName: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Use the billing history hook with filters
  const {
    billingHistory,
    loading,
    error,
    count,
    refetch,
    deleteBillingHistory
  } = useBillingHistory({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
    search: searchQuery || undefined
  })

  // Use stats hook
  const { stats, loading: statsLoading } = useBillingHistoryStats()

  // Setup pagination
  const pagination = usePagination(billingHistory, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'failed': return <AlertCircle className="h-4 w-4" />
      case 'refunded': return <TrendingUp className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Handle delete billing record - open dialog
  const handleDeleteClick = (record: any) => {
    const patientName = record.patients?.users?.full_name || 'Unknown Patient'
    setRecordToDelete({ id: record.id, patientName })
    setDeleteDialogOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return

    setDeleteLoading(true)
    try {
      const result = await deleteBillingHistory(recordToDelete.id)
      if (result.success) {
        toast.success('Billing record deleted successfully')
        setDeleteDialogOpen(false)
        setRecordToDelete(null)
      } else {
        toast.error(result.error || 'Failed to delete billing record')
      }
    } catch (error) {
      toast.error('Failed to delete billing record')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setRecordToDelete(null)
    setDeleteLoading(false)
  }



  const formatPrice = (price: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-8 w-8 mr-2" />
          Error loading payment history: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🧾 Payment History
          </h1>
          <p className="text-gray-600">
            Track all payment transactions and billing records
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            <Users className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Link href="/admin/accounting/payment-history/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Record
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              All payment records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statsLoading ? '...' : stats?.paid || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{statsLoading ? '...' : (stats?.totalAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statsLoading ? '...' : stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by patient name, transaction ID, or gateway..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Records ({count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment records found matching your search criteria
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {pagination.currentPageData.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {payment.patients?.users?.full_name || 'Unknown Patient'}
                          </h4>
                          <Badge className={getStatusColor(payment.status)}>
                            {getStatusIcon(payment.status)}
                            <span className="ml-1 capitalize">{payment.status}</span>
                          </Badge>
                          <span className="text-lg font-bold text-green-600">
                            ₹{payment.amount}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-1">
                          <div className="flex items-center">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {payment.payment_method} {payment.payment_gateway && `via ${payment.payment_gateway}`}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(new Date(payment.created_at))}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          Transaction ID: {payment.transaction_id}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/accounting/payment-history/${payment.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/accounting/payment-history/${payment.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(payment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {payment.invoice_url && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {billingHistory.length > 0 && (
                <div className="mt-6">
                  <PaginationWithInfo
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.goToPage}
                    hasNextPage={pagination.hasNextPage}
                    hasPreviousPage={pagination.hasPreviousPage}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    pageSizeOptions={pagination.pageSizeOptions}
                    onPageSizeChange={pagination.setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payment record for <strong>{recordToDelete?.patientName}</strong>?
              This action cannot be undone and will permanently remove the billing record from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Record
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
