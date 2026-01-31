'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Loader2, CreditCard, Receipt } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useCreateBillingHistory } from '@/hooks/useBillingHistory'
import { usePatientSubscriptions } from '@/hooks/usePatientSubscriptions'

interface BillingHistoryFormData {
  subscription_id: string
  amount: string
  payment_method: string
  payment_gateway: string
  transaction_id: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  invoice_url?: string
  metadata?: string
}

export default function AddBillingHistoryPage() {
  const router = useRouter()
  const { createBillingHistory } = useCreateBillingHistory()
  const { patientSubscriptions, loading: subscriptionsLoading } = usePatientSubscriptions()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<BillingHistoryFormData>({
    subscription_id: '',
    amount: '',
    payment_method: '',
    payment_gateway: '',
    transaction_id: '',
    status: 'pending',
    invoice_url: '',
    metadata: ''
  })

  const handleInputChange = (field: keyof BillingHistoryFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subscription_id || !formData.amount || !formData.payment_method || !formData.transaction_id) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      // Find the selected subscription to get patient_id
      const selectedSubscription = patientSubscriptions.find(sub => sub.id === formData.subscription_id)
      if (!selectedSubscription) {
        toast.error('Selected subscription not found')
        return
      }

      const billingData = {
        patient_id: selectedSubscription.patient_id,
        subscription_id: formData.subscription_id,
        amount: amount,
        payment_method: formData.payment_method,
        payment_gateway: formData.payment_gateway,
        transaction_id: formData.transaction_id,
        status: formData.status,
        invoice_url: formData.invoice_url || undefined,
        metadata: formData.metadata ? JSON.parse(formData.metadata) : undefined
      }

      const result = await createBillingHistory(billingData)
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Payment record created successfully!')
      router.push('/admin/accounting/payment-history')
    } catch (error) {
      console.error('Error creating payment record:', error)
      toast.error('Failed to create payment record')
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Add Payment Record</h1>
            <p className="text-gray-600">Create a new payment history record</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Subscription */}
              <div className="space-y-2">
                <Label htmlFor="subscription_id">Patient Subscription *</Label>
                <Select
                  value={formData.subscription_id}
                  onValueChange={(value) => handleInputChange('subscription_id', value)}
                  disabled={subscriptionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subscriptionsLoading ? "Loading..." : "Select subscription"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patientSubscriptions.map((subscription) => (
                      <SelectItem key={subscription.id} value={subscription.id}>
                        {subscription.patients?.users?.full_name} - {subscription.subscription_plans?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NetBanking">Net Banking</SelectItem>
                    <SelectItem value="Wallet">Digital Wallet</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Gateway */}
              <div className="space-y-2">
                <Label htmlFor="payment_gateway">Payment Gateway</Label>
                <Select
                  value={formData.payment_gateway}
                  onValueChange={(value) => handleInputChange('payment_gateway', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stripe">Stripe</SelectItem>
                    <SelectItem value="Razorpay">Razorpay</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="Square">Square</SelectItem>
                    <SelectItem value="Paytm">Paytm</SelectItem>
                    <SelectItem value="PhonePe">PhonePe</SelectItem>
                    <SelectItem value="GooglePay">Google Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction ID */}
              <div className="space-y-2">
                <Label htmlFor="transaction_id">Transaction ID *</Label>
                <Input
                  id="transaction_id"
                  placeholder="Enter transaction ID"
                  value={formData.transaction_id}
                  onChange={(e) => handleInputChange('transaction_id', e.target.value)}
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Payment Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as any)}
                >
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

            {/* Invoice URL */}
            <div className="space-y-2">
              <Label htmlFor="invoice_url">Invoice URL</Label>
              <Input
                id="invoice_url"
                type="url"
                placeholder="https://example.com/invoice.pdf"
                value={formData.invoice_url}
                onChange={(e) => handleInputChange('invoice_url', e.target.value)}
              />
            </div>

            {/* Metadata */}
            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <Textarea
                id="metadata"
                placeholder='{"gateway_response": "success", "reference": "REF123"}'
                value={formData.metadata}
                onChange={(e) => handleInputChange('metadata', e.target.value)}
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Optional JSON metadata for gateway responses or additional information
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/accounting/payment-history">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Payment Record
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
