'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { usePatientSubscriptions, usePatientSubscriptionStats } from '@/hooks/usePatientSubscriptions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Calendar,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Loader2,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default function PatientSubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')

  // Dialog state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<{ id: string; patientName: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Use the patient subscriptions hook with filters
  const {
    patientSubscriptions,
    loading,
    error,
    count,
    refetch,
    deletePatientSubscription
  } = usePatientSubscriptions({
    subscription_status: statusFilter !== 'all' ? statusFilter : undefined,
    payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    search: searchQuery || undefined
  })

  // Use stats hook
  const { stats, loading: statsLoading } = usePatientSubscriptionStats()

  // Setup pagination
  const pagination = usePagination(patientSubscriptions, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
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
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'expired': return <AlertCircle className="h-4 w-4" />
      case 'cancelled': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Handle delete subscription - open dialog
  const handleDeleteClick = (subscription: any) => {
    const patientName = subscription.patients?.users?.full_name || 'Unknown Patient'
    setSubscriptionToDelete({ id: subscription.id, patientName })
    setDeleteDialogOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!subscriptionToDelete) return

    setDeleteLoading(true)
    try {
      const result = await deletePatientSubscription(subscriptionToDelete.id)
      if (result.success) {
        toast.success('Patient subscription deleted successfully')
        setDeleteDialogOpen(false)
        setSubscriptionToDelete(null)
      } else {
        toast.error(result.error || 'Failed to delete patient subscription')
      }
    } catch (error) {
      toast.error('Failed to delete patient subscription')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setSubscriptionToDelete(null)
    setDeleteLoading(false)
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
          Error loading patient subscriptions: {error}
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
            👥 Patient Subscriptions
          </h1>
          <p className="text-gray-600">
            Manage patient subscription status and billing
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            <Users className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Link href="/admin/accounting/patient-subscriptions/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              All patient subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statsLoading ? '...' : stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statsLoading ? '...' : stats?.expired || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need renewal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{statsLoading ? '...' : (stats?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From paid subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by patient name, plan, or transaction ID..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Subscriptions ({count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patientSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No subscriptions found matching your search criteria
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {pagination.currentPageData.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {subscription.patients?.users?.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {subscription.patients?.users?.full_name || 'Unknown Patient'}
                          </h4>
                          <Badge className={getStatusColor(subscription.subscription_status)}>
                            {getStatusIcon(subscription.subscription_status)}
                            <span className="ml-1 capitalize">{subscription.subscription_status}</span>
                          </Badge>
                          <Badge className={getPaymentStatusColor(subscription.payment_status)}>
                            <span className="capitalize">{subscription.payment_status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Plan: {subscription.subscription_plans?.name} - ₹{subscription.subscription_plans?.price || 0}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(new Date(subscription.start_date))} - {formatDate(new Date(subscription.end_date))}
                          </div>
                          {subscription.transaction_id && (
                            <div className="text-xs font-mono">
                              ID: {subscription.transaction_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/accounting/patient-subscriptions/${subscription.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/accounting/patient-subscriptions/${subscription.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(subscription)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {patientSubscriptions.length > 0 && (
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
            <DialogTitle>Delete Patient Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the subscription for <strong>{subscriptionToDelete?.patientName}</strong>?
              This action cannot be undone and will permanently remove the subscription from the system.
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
                  Delete Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
