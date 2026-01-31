'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Loader2, Users, CreditCard, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { usePatientSubscription, useUpdatePatientSubscription } from '@/hooks/usePatientSubscriptions'
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans'
import { usePatients } from '@/hooks/usePatients'

interface PatientSubscriptionFormData {
  patient_id: string
  subscription_plan_id: string
  start_date: string
  end_date: string
  subscription_status: 'active' | 'expired' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  amount_paid: string
  payment_method?: string
  payment_gateway?: string
  transaction_id?: string
  notes?: string
}

export default function EditPatientSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { patientSubscription, loading: subscriptionLoading, error: subscriptionError } = usePatientSubscription(resolvedParams.id)
  const { updatePatientSubscription } = useUpdatePatientSubscription()
  const { subscriptionPlans, loading: plansLoading } = useSubscriptionPlans()
  const { patients, loading: patientsLoading } = usePatients()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<PatientSubscriptionFormData>({
    patient_id: '',
    subscription_plan_id: '',
    start_date: '',
    end_date: '',
    subscription_status: 'active',
    payment_status: 'pending',
    amount_paid: '',
    payment_method: '',
    payment_gateway: '',
    transaction_id: '',
    notes: ''
  })

  useEffect(() => {
    if (patientSubscription) {
      setFormData({
        patient_id: patientSubscription.patient_id,
        subscription_plan_id: patientSubscription.subscription_plan_id,
        start_date: patientSubscription.start_date.split('T')[0],
        end_date: patientSubscription.end_date.split('T')[0],
        subscription_status: patientSubscription.subscription_status,
        payment_status: patientSubscription.payment_status,
        amount_paid: patientSubscription.amount_paid.toString(),
        payment_method: patientSubscription.payment_method || '',
        payment_gateway: patientSubscription.payment_gateway || '',
        transaction_id: patientSubscription.transaction_id || '',
        notes: patientSubscription.notes || ''
      })
      setLoading(false)
    } else if (subscriptionError) {
      setError(subscriptionError)
      setLoading(false)
    } else if (!subscriptionLoading) {
      setLoading(false)
    }
  }, [patientSubscription, subscriptionError, subscriptionLoading])

  const handleInputChange = (field: keyof PatientSubscriptionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.patient_id || !formData.subscription_plan_id || !formData.start_date || !formData.end_date || !formData.amount_paid) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const result = await updatePatientSubscription(resolvedParams.id, {
        patient_id: formData.patient_id,
        subscription_plan_id: formData.subscription_plan_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        subscription_status: formData.subscription_status,
        payment_status: formData.payment_status,
        amount_paid: parseFloat(formData.amount_paid),
        payment_method: formData.payment_method || undefined,
        payment_gateway: formData.payment_gateway || undefined,
        transaction_id: formData.transaction_id || undefined,
        notes: formData.notes || undefined
      })

      if (result.success) {
        toast.success('Patient subscription updated successfully')
        router.push('/admin/accounting/patient-subscriptions')
      } else {
        toast.error(result.error || 'Failed to update patient subscription')
      }
    } catch (error) {
      toast.error('Failed to update patient subscription')
    } finally {
      setSaving(false)
    }
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

  const selectedPlan = subscriptionPlans.find(plan => plan.id === formData.subscription_plan_id)

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
            <h1 className="text-2xl font-bold text-gray-900">Edit Patient Subscription</h1>
            <p className="text-gray-600">Update subscription details</p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          <Users className="h-3 w-3 mr-1" />
          Admin Access
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient & Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient & Plan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="patient_id">Patient *</Label>
                <Select value={formData.patient_id} onValueChange={(value) => handleInputChange('patient_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.user_id} value={patient.user_id}>
                        {patient.full_name || 'Unknown Patient'} - {patient.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subscription_plan_id">Subscription Plan *</Label>
                <Select value={formData.subscription_plan_id} onValueChange={(value) => handleInputChange('subscription_plan_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select plan"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">{selectedPlan.name}</h4>
                  <p className="text-sm text-blue-700">{selectedPlan.description}</p>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>Price: ₹{selectedPlan.price}</span>
                    <span>Duration: {selectedPlan.duration_days} days</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscription_status">Subscription Status</Label>
                  <Select value={formData.subscription_status} onValueChange={(value: any) => handleInputChange('subscription_status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value: any) => handleInputChange('payment_status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount_paid">Amount Paid *</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={(e) => handleInputChange('amount_paid', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NetBanking">Net Banking</SelectItem>
                    <SelectItem value="Wallet">Wallet</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_gateway">Payment Gateway</Label>
                <Select value={formData.payment_gateway} onValueChange={(value) => handleInputChange('payment_gateway', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stripe">Stripe</SelectItem>
                    <SelectItem value="Razorpay">Razorpay</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="Paytm">Paytm</SelectItem>
                    <SelectItem value="PhonePe">PhonePe</SelectItem>
                    <SelectItem value="GooglePay">Google Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transaction_id">Transaction ID</Label>
                <Input
                  id="transaction_id"
                  value={formData.transaction_id}
                  onChange={(e) => handleInputChange('transaction_id', e.target.value)}
                  placeholder="Enter transaction ID"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about the subscription"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href="/admin/accounting/patient-subscriptions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Subscription
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
