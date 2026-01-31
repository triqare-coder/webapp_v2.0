'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CreditCard, 
  Save, 
  ArrowLeft,
  Building2,
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useCreateSubscriptionPlan } from '@/hooks/useSubscriptionPlans'
import { toast } from 'sonner'

export default function AddSubscriptionPlanPage() {
  const router = useRouter()
  const { createSubscriptionPlan, loading: isSubmitting } = useCreateSubscriptionPlan()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    is_active: true
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Plan name is required')
      return
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Price must be a positive number')
      return
    }
    
    if (!formData.duration_days || parseInt(formData.duration_days) <= 0) {
      toast.error('Duration must be a positive number of days')
      return
    }

    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration_days),
        is_active: formData.is_active
      }

      const result = await createSubscriptionPlan(planData)
      
      if (result) {
        toast.success('Subscription plan created successfully!')
        router.push('/admin/accounting/subscription-plans')
      } else {
        toast.error('Failed to create subscription plan')
      }
    } catch (error) {
      console.error('Error creating subscription plan:', error)
      toast.error('An error occurred while creating the subscription plan')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/accounting/subscription-plans">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subscription Plans
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Subscription Plan</h1>
            <p className="text-muted-foreground">Create a new subscription plan for patients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Building2 className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Basic Plan, Premium Plan"
                  required
                />
              </div>
              <div>
                <Label htmlFor="is_active">Status *</Label>
                <Select
                  value={formData.is_active.toString()}
                  onValueChange={(value) => handleInputChange('is_active', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this subscription plan includes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="duration_days">Duration (Days) *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration_days"
                    type="number"
                    min="1"
                    value={formData.duration_days}
                    onChange={(e) => handleInputChange('duration_days', e.target.value)}
                    placeholder="30"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• Price should be in your local currency</p>
              <p>• Duration is the validity period of the subscription in days</p>
              <p>• Common durations: 30 days (monthly), 90 days (quarterly), 365 days (yearly)</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/accounting/subscription-plans">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Plan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
