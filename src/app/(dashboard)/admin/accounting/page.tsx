'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockSubscriptionPlans, mockPatientSubscriptions, mockBillingHistory } from '@/lib/mock-data'
import {
  CreditCard,
  Package,
  Users,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Calendar,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function AccountingDashboardPage() {
  // Calculate statistics
  const totalPlans = mockSubscriptionPlans.length
  const activePlans = mockSubscriptionPlans.filter(p => p.is_active).length
  
  const totalSubscriptions = mockPatientSubscriptions.length
  const activeSubscriptions = mockPatientSubscriptions.filter(s => s.subscription_status === 'active').length
  const expiredSubscriptions = mockPatientSubscriptions.filter(s => s.subscription_status === 'expired').length
  
  const totalTransactions = mockBillingHistory.length
  const successfulPayments = mockBillingHistory.filter(p => p.status === 'paid').length
  const pendingPayments = mockBillingHistory.filter(p => p.status === 'pending').length
  const failedPayments = mockBillingHistory.filter(p => p.status === 'failed').length
  
  const totalRevenue = mockBillingHistory
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  
  const monthlyRevenue = mockBillingHistory
    .filter(p => {
      const paymentDate = new Date(p.created_at)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      return p.status === 'paid' && 
             paymentDate.getMonth() === currentMonth && 
             paymentDate.getFullYear() === currentYear
    })
    .reduce((sum, p) => sum + p.amount, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
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

  // Recent transactions (last 5)
  const recentTransactions = mockBillingHistory
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Recent subscriptions (last 5)
  const recentSubscriptions = mockPatientSubscriptions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'expired': case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'refunded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': case 'active': return <CheckCircle className="h-3 w-3" />
      case 'pending': return <Clock className="h-3 w-3" />
      case 'failed': case 'expired': return <AlertCircle className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            💳 Accounting Dashboard
          </h1>
          <p className="text-gray-600">
            Financial overview and billing management
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          <CreditCard className="h-3 w-3 mr-1" />
          Admin Access
        </Badge>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              All-time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatPrice(monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalTransactions > 0 ? Math.round((successfulPayments / totalTransactions) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Payment success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Subscription Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Plans</span>
                <span className="font-semibold">{totalPlans}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Plans</span>
                <span className="font-semibold text-green-600">{activePlans}</span>
              </div>
              <Link href="/admin/accounting/subscription-plans">
                <Button className="w-full mt-4" variant="outline">
                  Manage Plans
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Patient Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Subscriptions</span>
                <span className="font-semibold">{totalSubscriptions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-semibold text-green-600">{activeSubscriptions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expired</span>
                <span className="font-semibold text-red-600">{expiredSubscriptions}</span>
              </div>
              <Link href="/admin/accounting/patient-subscriptions">
                <Button className="w-full mt-4" variant="outline">
                  Manage Subscriptions
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="font-semibold">{totalTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Successful</span>
                <span className="font-semibold text-green-600">{successfulPayments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-semibold text-yellow-600">{pendingPayments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{failedPayments}</span>
              </div>
              <Link href="/admin/accounting/payment-history">
                <Button className="w-full mt-4" variant="outline">
                  View History
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {transaction.patient?.firstName} {transaction.patient?.lastName}
                      </span>
                      <Badge className={getStatusColor(transaction.status)} variant="secondary">
                        {getStatusIcon(transaction.status)}
                        <span className="ml-1 capitalize">{transaction.status}</span>
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatPrice(transaction.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {transaction.payment_method}
                    </div>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No recent transactions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {subscription.patient?.firstName} {subscription.patient?.lastName}
                      </span>
                      <Badge className={getStatusColor(subscription.subscription_status)} variant="secondary">
                        {getStatusIcon(subscription.subscription_status)}
                        <span className="ml-1 capitalize">{subscription.subscription_status}</span>
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Plan: {subscription.plan?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">
                      {formatPrice(subscription.plan?.price || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(subscription.start_date)}
                    </div>
                  </div>
                </div>
              ))}
              {recentSubscriptions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No recent subscriptions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
