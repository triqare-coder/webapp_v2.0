'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, AlertTriangle, MapPin, Phone, User, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

export default function CreateSOSPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Emergency Details
    priority: '',
    emergencyType: '',
    description: '',
    symptoms: '',
    
    // Patient Information
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientPhone: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    
    // Location Information
    address: '',
    city: '',
    state: '',
    zipCode: '',
    landmark: '',
    coordinates: '',
    accessInstructions: '',
    
    // Contact Information
    callerName: '',
    callerPhone: '',
    callerRelation: '',
    alternateContact: '',
    alternatePhone: '',
    
    // Additional Information
    consciousnessLevel: '',
    breathing: '',
    pulse: '',
    bleeding: '',
    mobility: '',
    specialRequirements: [] as string[],
    
    // Assignment
    preferredHospital: '',
    assignedAmbulance: '',
    assignedDriver: '',
    estimatedResponseTime: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // This form is not yet wired to the SOS dispatch backend. Previously it
    // faked success with a setTimeout + alert claiming an emergency had been
    // dispatched, which is dangerous in an emergency-response product because
    // no SOS record is ever created. Until it is connected to the real SOS
    // creation service, we must NOT report a false dispatch. Use the working
    // dispatch flow on the /erteam/sos page instead.
    console.log('SOS create form submitted (not connected to backend):', formData)
    alert(
      'This form is not connected to the dispatch system yet, so NO emergency was created or dispatched. ' +
      'Please use the SOS dispatch page to create and dispatch a real emergency.'
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSpecialRequirementToggle = (requirement: string) => {
    setFormData(prev => ({
      ...prev,
      specialRequirements: prev.specialRequirements.includes(requirement)
        ? prev.specialRequirements.filter(r => r !== requirement)
        : [...prev.specialRequirements, requirement]
    }))
  }

  const specialRequirements = [
    'Wheelchair Access',
    'Oxygen Support',
    'Cardiac Monitor',
    'Pediatric Equipment',
    'Psychiatric Support',
    'Trauma Kit',
    'Burn Treatment',
    'Spinal Board',
    'IV Equipment',
    'Defibrillator'
  ]

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/erteam/sos">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to SOS Cases
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Zap className="h-6 w-6 mr-2 text-red-600" />
                Create Emergency SOS Case
              </h1>
              <p className="text-gray-600">Report and dispatch emergency response</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Emergency Details */}
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Details
              </CardTitle>
              <CardDescription>Critical emergency information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level *</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger className="border-red-300">
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">🔴 Critical - Life Threatening</SelectItem>
                      <SelectItem value="high">🟠 High - Urgent Care Needed</SelectItem>
                      <SelectItem value="medium">🟡 Medium - Stable but Needs Care</SelectItem>
                      <SelectItem value="low">🟢 Low - Non-Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyType">Emergency Type *</Label>
                  <Select value={formData.emergencyType} onValueChange={(value) => handleInputChange('emergencyType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select emergency type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiac">Cardiac Emergency</SelectItem>
                      <SelectItem value="respiratory">Respiratory Distress</SelectItem>
                      <SelectItem value="trauma">Trauma/Injury</SelectItem>
                      <SelectItem value="stroke">Stroke/Neurological</SelectItem>
                      <SelectItem value="overdose">Overdose/Poisoning</SelectItem>
                      <SelectItem value="psychiatric">Psychiatric Emergency</SelectItem>
                      <SelectItem value="obstetric">Obstetric Emergency</SelectItem>
                      <SelectItem value="pediatric">Pediatric Emergency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Emergency Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the emergency situation in detail..."
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptoms">Current Symptoms</Label>
                <Textarea
                  id="symptoms"
                  value={formData.symptoms}
                  onChange={(e) => handleInputChange('symptoms', e.target.value)}
                  placeholder="List current symptoms and patient condition..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Patient Information
              </CardTitle>
              <CardDescription>Patient details and medical history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input
                    id="patientName"
                    value={formData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    value={formData.patientAge}
                    onChange={(e) => handleInputChange('patientAge', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientGender">Gender</Label>
                  <Select value={formData.patientGender} onValueChange={(value) => handleInputChange('patientGender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Patient Phone</Label>
                  <Input
                    id="patientPhone"
                    type="tel"
                    value={formData.patientPhone}
                    onChange={(e) => handleInputChange('patientPhone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Medical History</Label>
                  <Input
                    id="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                    placeholder="Known medical conditions..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Input
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    placeholder="Known allergies..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medications">Current Medications</Label>
                  <Input
                    id="medications"
                    value={formData.medications}
                    onChange={(e) => handleInputChange('medications', e.target.value)}
                    placeholder="Current medications..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Information
              </CardTitle>
              <CardDescription>Emergency location and access details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="landmark">Nearby Landmark</Label>
                  <Input
                    id="landmark"
                    value={formData.landmark}
                    onChange={(e) => handleInputChange('landmark', e.target.value)}
                    placeholder="e.g., Near City Hall, Behind McDonald's"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coordinates">GPS Coordinates</Label>
                  <Input
                    id="coordinates"
                    value={formData.coordinates}
                    onChange={(e) => handleInputChange('coordinates', e.target.value)}
                    placeholder="Latitude, Longitude"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessInstructions">Access Instructions</Label>
                <Textarea
                  id="accessInstructions"
                  value={formData.accessInstructions}
                  onChange={(e) => handleInputChange('accessInstructions', e.target.value)}
                  placeholder="Special instructions for accessing the location (floor, apartment, gate code, etc.)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
              <CardDescription>Caller and emergency contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="callerName">Caller Name *</Label>
                  <Input
                    id="callerName"
                    value={formData.callerName}
                    onChange={(e) => handleInputChange('callerName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callerPhone">Caller Phone *</Label>
                  <Input
                    id="callerPhone"
                    type="tel"
                    value={formData.callerPhone}
                    onChange={(e) => handleInputChange('callerPhone', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callerRelation">Relation to Patient</Label>
                  <Select value={formData.callerRelation} onValueChange={(value) => handleInputChange('callerRelation', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="family">Family Member</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="neighbor">Neighbor</SelectItem>
                      <SelectItem value="bystander">Bystander</SelectItem>
                      <SelectItem value="healthcare">Healthcare Provider</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alternateContact">Alternate Contact Name</Label>
                  <Input
                    id="alternateContact"
                    value={formData.alternateContact}
                    onChange={(e) => handleInputChange('alternateContact', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Alternate Contact Phone</Label>
                  <Input
                    id="alternatePhone"
                    type="tel"
                    value={formData.alternatePhone}
                    onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Special Requirements</CardTitle>
              <CardDescription>Additional equipment or support needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialRequirements.map((requirement) => (
                  <div key={requirement} className="flex items-center space-x-2">
                    <Checkbox
                      id={requirement}
                      checked={formData.specialRequirements.includes(requirement)}
                      onCheckedChange={() => handleSpecialRequirementToggle(requirement)}
                    />
                    <Label htmlFor={requirement} className="text-sm">
                      {requirement}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link href="/erteam/sos">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating Emergency...' : 'Create SOS Case'}
            </Button>
          </div>
        </form>
      </div>
  )
}
