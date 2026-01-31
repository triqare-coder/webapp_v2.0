'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { useSubscriptionPlans, useSubscriptionPlanStats, useDeleteSubscriptionPlan } from '@/hooks/useSubscriptionPlans'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

export default function SubscriptionPlansPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch subscription plans and stats
  const { subscriptionPlans, loading: plansLoading, error: plansError } = useSubscriptionPlans({
    search: searchQuery || undefined,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active'
  })
  const { stats, loading: statsLoading } = useSubscriptionPlanStats()
  const { deleteSubscriptionPlan, loading: deleteLoading } = useDeleteSubscriptionPlan()

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null)

  // Filtered plans based on search and filters (client-side filtering for immediate response)
  const filteredPlans = useMemo(() => {
    return subscriptionPlans.filter(plan => {
      const matchesSearch = !searchQuery ||
                           plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           plan.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && plan.is_active) ||
                           (statusFilter === 'inactive' && !plan.is_active)

      return matchesSearch && matchesStatus
    })
  }, [subscriptionPlans, searchQuery, statusFilter])

  // Setup pagination
  const pagination = usePagination(filteredPlans, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  })

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Delete handlers
  const handleDeleteClick = (plan: { id: string; name: string }) => {
    setPlanToDelete(plan)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return

    try {
      const success = await deleteSubscriptionPlan(planToDelete.id)
      if (success) {
        toast.success(`Subscription plan "${planToDelete.name}" deleted successfully`)
        setDeleteDialogOpen(false)
        setPlanToDelete(null)
        // Refresh the data by triggering a re-fetch
        window.location.reload()
      }
    } catch (error) {
      toast.error('Failed to delete subscription plan')
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setPlanToDelete(null)
  }

  const formatDuration = (days: number) => {
    if (days === 30) return '1 Month'
    if (days === 365) return '1 Year'
    if (days < 30) return `${days} Days`
    if (days < 365) return `${Math.round(days / 30)} Months`
    return `${Math.round(days / 365)} Years`
  }

  // Show loading state
  if (plansLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Show error state
  if (plansError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Error Loading Subscription Plans</h2>
            <p className="text-muted-foreground">{plansError}</p>
          </div>
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
            📦 Subscription Plans
          </h1>
          <p className="text-gray-600">
            Manage subscription plans and pricing
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            <Package className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Link href="/admin/accounting/subscription-plans/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
              ) : (
                stats?.total || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              All subscription plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
              ) : (
                stats?.active || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Plans</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
              ) : (
                stats?.inactive || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Not currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                formatPrice(stats?.averagePrice || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Average plan price
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or description..."
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
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Plans ({filteredPlans.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No subscription plans found matching your search criteria
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {pagination.currentPageData.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          <Badge className={getStatusColor(plan.is_active)}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {plan.description || 'No description provided'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {formatPrice(plan.price)}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDuration(plan.duration_days)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/accounting/subscription-plans/${plan.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/accounting/subscription-plans/${plan.id}`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick({ id: plan.id, name: plan.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filteredPlans.length > 0 && (
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
            <DialogTitle>Delete Subscription Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the subscription plan "{planToDelete?.name}"?
              This action cannot be undone and will affect all associated patient subscriptions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
