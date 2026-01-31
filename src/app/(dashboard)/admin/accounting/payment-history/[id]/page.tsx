'use client'

import { use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Loader2, CreditCard, Receipt, ExternalLink, Calendar, User, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useBillingHistoryRecord } from '@/hooks/useBillingHistory'

export default function BillingHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { billingRecord, loading } = useBillingHistoryRecord(resolvedParams.id)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!billingRecord) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Record Not Found</h2>
        <p className="text-gray-600 mb-4">The payment record you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/admin/accounting/payment-history">Back to Payment History</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/accounting/payment-history">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payment History
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Record Details</h1>
            <p className="text-gray-600">Transaction ID: {billingRecord.transaction_id}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/accounting/payment-history/${resolvedParams.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Record
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(billingRecord.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(billingRecord.status)}>
                      {billingRecord.status.charAt(0).toUpperCase() + billingRecord.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="text-lg font-medium text-gray-900">{billingRecord.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Gateway</label>
                  <p className="text-lg font-medium text-gray-900">{billingRecord.payment_gateway || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                  <p className="text-lg font-mono text-gray-900 bg-gray-50 p-2 rounded border">
                    {billingRecord.transaction_id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Subscription Details */}
          {billingRecord.patient_subscriptions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Patient</label>
                    <p className="text-lg font-medium text-gray-900">
                      {billingRecord.patients?.users?.full_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg text-gray-900">
                      {billingRecord.patients?.users?.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subscription Plan</label>
                    <p className="text-lg font-medium text-gray-900">
                      {billingRecord.patient_subscriptions.subscription_plans?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subscription Period</label>
                    <p className="text-lg font-medium text-gray-900">
                      {billingRecord.patient_subscriptions.start_date && billingRecord.patient_subscriptions.end_date
                        ? `${formatDate(billingRecord.patient_subscriptions.start_date)} - ${formatDate(billingRecord.patient_subscriptions.end_date)}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          {billingRecord.metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded border text-sm overflow-x-auto">
                  {JSON.stringify(billingRecord.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href={`/admin/accounting/payment-history/${resolvedParams.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Record
                </Link>
              </Button>
              {billingRecord.invoice_url && (
                <Button variant="outline" asChild className="w-full">
                  <a href={billingRecord.invoice_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Invoice
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Payment Created</p>
                  <p className="text-sm text-gray-500">{formatDate(billingRecord.created_at)}</p>
                </div>
              </div>
              {billingRecord.status === 'paid' && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payment Completed</p>
                    <p className="text-sm text-gray-500">Transaction processed successfully</p>
                  </div>
                </div>
              )}
              {billingRecord.status === 'failed' && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payment Failed</p>
                    <p className="text-sm text-gray-500">Transaction could not be processed</p>
                  </div>
                </div>
              )}
              {billingRecord.status === 'refunded' && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payment Refunded</p>
                    <p className="text-sm text-gray-500">Amount refunded to customer</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="font-medium">{formatCurrency(billingRecord.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className={getStatusColor(billingRecord.status)}>
                  {billingRecord.status.charAt(0).toUpperCase() + billingRecord.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Method</span>
                <span className="font-medium">{billingRecord.payment_method || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Gateway</span>
                <span className="font-medium">{billingRecord.payment_gateway || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
