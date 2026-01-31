'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { ERTDashboard } from '@/components/dashboards/ert-dashboard'
import { TransportDashboard } from '@/components/dashboards/transport-dashboard'
import { Logo } from '@/components/ui/logo'
import {
  Shield,
  AlertTriangle,
  Truck,
  Users,
  Building2,
  Phone,
  BarChart3,
  MapPin
} from 'lucide-react'

export default function DemoPage() {
  const [activeRole, setActiveRole] = useState('admin')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <p className="text-sm text-gray-500">Interactive Demo</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Live Demo
              </Button>
              <Button size="sm">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select User Role to Explore:</h2>
            <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="admin" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </TabsTrigger>
                <TabsTrigger value="ert" className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Emergency Response Team</span>
                </TabsTrigger>
                <TabsTrigger value="transport" className="flex items-center space-x-2">
                  <Truck className="h-4 w-4" />
                  <span>Transport Company</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Role Description */}
      <div className="bg-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {activeRole === 'admin' && (
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Administrator Dashboard</h3>
                <p className="text-blue-700 text-sm">
                  Full system access to manage patients, hospitals, ambulances, drivers, users, and generate reports. 
                  Monitor overall system performance and emergency response metrics.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    <Users className="h-3 w-3 mr-1" />
                    Patient Management
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    <Building2 className="h-3 w-3 mr-1" />
                    Hospital Network
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    <Truck className="h-3 w-3 mr-1" />
                    Fleet Management
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Analytics & Reports
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeRole === 'ert' && (
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Emergency Response Team Dashboard</h3>
                <p className="text-red-700 text-sm">
                  Monitor active emergencies, dispatch ambulances, track response times, and coordinate with hospitals. 
                  Real-time emergency management and resource allocation.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    <Phone className="h-3 w-3 mr-1" />
                    SOS Monitoring
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    <MapPin className="h-3 w-3 mr-1" />
                    Live Tracking
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    <Truck className="h-3 w-3 mr-1" />
                    Ambulance Dispatch
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeRole === 'transport' && (
            <div className="flex items-start space-x-3">
              <Truck className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Transport Company Dashboard</h3>
                <p className="text-green-700 text-sm">
                  Manage your drivers and emergency assignments.
                  Track driver availability and current emergency responses.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <Truck className="h-3 w-3 mr-1" />
                    Transport Operations
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <Users className="h-3 w-3 mr-1" />
                    Driver Management
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <Phone className="h-3 w-3 mr-1" />
                    Assignment Tracking
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeRole} className="w-full">
          <TabsContent value="admin" className="mt-0">
            <AdminDashboard />
          </TabsContent>
          <TabsContent value="ert" className="mt-0">
            <ERTDashboard />
          </TabsContent>
          <TabsContent value="transport" className="mt-0">
            <TransportDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <p className="text-gray-400 mb-4">
            This is a demonstration of the Emergency Response Platform
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" size="sm">
              View Source Code
            </Button>
            <Button size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
