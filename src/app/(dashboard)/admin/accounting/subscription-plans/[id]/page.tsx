'use client'

import { useState, useEffect } from 'react'
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
  FileText,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useSubscriptionPlan, useUpdateSubscriptionPlan, useDeleteSubscriptionPlan } from '@/hooks/useSubscriptionPlans'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PageProps {
  params: {
    id: string
  }
}

export default function SubscriptionPlanDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { subscriptionPlan, loading: planLoading, error: planError } = useSubscriptionPlan(params.id)
  const { updateSubscriptionPlan, loading: isUpdating } = useUpdateSubscriptionPlan()
  const { deleteSubscriptionPlan, loading: isDeleting } = useDeleteSubscriptionPlan()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    is_active: true
  })

  // Populate form data when subscription plan is loaded
  useEffect(() => {
    if (subscriptionPlan) {
      setFormData({
        name: subscriptionPlan.name || '',
        description: subscriptionPlan.description || '',
        price: subscriptionPlan.price?.toString() || '',
        duration_days: subscriptionPlan.duration_days?.toString() || '',
        is_active: subscriptionPlan.is_active ?? true
      })
    }
  }, [subscriptionPlan])

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
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration_days),
        is_active: formData.is_active
      }

      const result = await updateSubscriptionPlan(params.id, updateData)
      
      if (result) {
        toast.success('Subscription plan updated successfully!')
        setIsEditing(false)
      } else {
        toast.error('Failed to update subscription plan')
      }
    } catch (error) {
      console.error('Error updating subscription plan:', error)
      toast.error('An error occurred while updating the subscription plan')
    }
  }

  const handleDelete = async () => {
    try {
      const success = await deleteSubscriptionPlan(params.id)
      
      if (success) {
        toast.success('Subscription plan deleted successfully!')
        router.push('/admin/accounting/subscription-plans')
      } else {
        toast.error('Failed to delete subscription plan')
      }
    } catch (error) {
      console.error('Error deleting subscription plan:', error)
      toast.error('An error occurred while deleting the subscription plan')
    }
  }

  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (planError || !subscriptionPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Subscription Plan Not Found</h2>
          <p className="text-muted-foreground">The subscription plan you're looking for doesn't exist or has been deleted.</p>
        </div>
        <Link href="/admin/accounting/subscription-plans">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subscription Plans
          </Button>
        </Link>
      </div>
    )
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
            <h1 className="text-3xl font-bold tracking-tight">{subscriptionPlan.name}</h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Edit subscription plan details' : 'View subscription plan information'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscriptionPlan.is_active ? "default" : "secondary"}>
            {subscriptionPlan.is_active ? "Active" : "Inactive"}
          </Badge>
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
                  disabled={!isEditing}
                  required
                />
              </div>
              <div>
                <Label htmlFor="is_active">Status *</Label>
                <Select
                  value={formData.is_active.toString()}
                  onValueChange={(value) => handleInputChange('is_active', value === 'true')}
                  disabled={!isEditing}
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
                disabled={!isEditing}
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
                    className="pl-10"
                    disabled={!isEditing}
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
                    className="pl-10"
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>
            </div>
            
            {!isEditing && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Created: {new Date(subscriptionPlan.created_at).toLocaleDateString()}</p>
                <p>• Last Updated: {new Date(subscriptionPlan.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {!isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Plan
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the subscription plan
                      "{subscriptionPlan.name}" and remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Plan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Plan
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
