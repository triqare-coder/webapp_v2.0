'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Edit, Loader2, Users, CreditCard, Calendar, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { usePatientSubscription } from '@/hooks/usePatientSubscriptions'

export default function ViewPatientSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { patientSubscription: subscription, loading, error } = usePatientSubscription(resolvedParams.id)



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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-8 w-8 mr-2" />
          {error}
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <AlertCircle className="h-8 w-8 mr-2" />
          Subscription not found
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/accounting/patient-subscriptions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subscriptions
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Subscription Details</h1>
            <p className="text-gray-600">View subscription information</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            <Users className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Link href={`/admin/accounting/patient-subscriptions/${subscription.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Subscription
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {subscription.patients?.users?.full_name?.[0] || 'U'}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{subscription.patients?.users?.full_name || 'Unknown Patient'}</h3>
                <p className="text-gray-600">{subscription.patients?.users?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Patient ID:</span>
                <p className="text-gray-900">{subscription.patient_id}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">User ID:</span>
                <p className="text-gray-900">{subscription.patients?.user_id || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">{subscription.subscription_plans?.name}</h3>
              <p className="text-blue-700 text-sm mt-1">{subscription.subscription_plans?.description}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-2xl font-bold text-blue-900">₹{subscription.subscription_plans?.price}</span>
                <Badge className="bg-blue-200 text-blue-800">
                  {subscription.subscription_plans?.duration_days} days
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Plan ID:</span>
                <p className="text-gray-900">{subscription.subscription_plan_id}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <Badge className={getStatusColor(subscription.subscription_status)}>
                  {getStatusIcon(subscription.subscription_status)}
                  <span className="ml-1 capitalize">{subscription.subscription_status}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscription Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Start Date</span>
                </div>
                <p className="text-green-900 font-semibold">{formatDate(subscription.start_date)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">End Date</span>
                </div>
                <p className="text-red-900 font-semibold">{formatDate(subscription.end_date)}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-800">Duration</span>
              </div>
              <p className="text-gray-900 font-semibold">
                {Math.ceil((new Date(subscription.end_date).getTime() - new Date(subscription.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>

            <Separator />

            <div className="text-sm text-gray-600">
              <p><strong>Created:</strong> {formatDate(subscription.created_at)}</p>
              {subscription.updated_at && (
                <p><strong>Last Updated:</strong> {formatDate(subscription.updated_at)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">₹{subscription.amount_paid}</span>
              <Badge className={getPaymentStatusColor(subscription.payment_status)}>
                <span className="capitalize">{subscription.payment_status}</span>
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              {subscription.payment_method && (
                <div>
                  <span className="font-medium text-gray-700">Payment Method:</span>
                  <p className="text-gray-900">{subscription.payment_method}</p>
                </div>
              )}
              {subscription.payment_gateway && (
                <div>
                  <span className="font-medium text-gray-700">Payment Gateway:</span>
                  <p className="text-gray-900">{subscription.payment_gateway}</p>
                </div>
              )}
              {subscription.transaction_id && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Transaction ID:</span>
                  <p className="text-gray-900 font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                    {subscription.transaction_id}
                  </p>
                </div>
              )}
            </div>

            {subscription.notes && (
              <>
                <Separator />
                <div>
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    {subscription.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
