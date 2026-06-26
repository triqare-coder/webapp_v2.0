'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  BarChart3, 
  Download, 
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  Building2,
  Truck,
  AlertTriangle,
  Calendar,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react'

export default function AdminReportsPage() {
  // Mock data - in a real app, this would come from your API
  const reportData = {
    overview: {
      totalEmergencies: 1247,
      avgResponseTime: 4.2,
      successRate: 94.8,
      activeAmbulances: 23
    },
    trends: {
      emergenciesChange: 12.5,
      responseTimeChange: -8.3,
      successRateChange: 2.1,
      ambulancesChange: 5.2
    },
    monthlyStats: [
      { month: 'Jan', emergencies: 98, responseTime: 4.5, successRate: 92 },
      { month: 'Feb', emergencies: 112, responseTime: 4.2, successRate: 94 },
      { month: 'Mar', emergencies: 105, responseTime: 4.0, successRate: 95 },
      { month: 'Apr', emergencies: 118, responseTime: 3.8, successRate: 96 },
      { month: 'May', emergencies: 124, responseTime: 4.1, successRate: 94 },
      { month: 'Jun', emergencies: 131, responseTime: 4.3, successRate: 93 }
    ],
    emergencyTypes: [
      { type: 'Medical Emergency', count: 456, percentage: 36.6 },
      { type: 'Traffic Accident', count: 312, percentage: 25.0 },
      { type: 'Fire Emergency', count: 189, percentage: 15.2 },
      { type: 'Cardiac Arrest', count: 156, percentage: 12.5 },
      { type: 'Other', count: 134, percentage: 10.7 }
    ],
    hospitalPerformance: [
      { name: 'Central Medical Center', cases: 234, avgTime: 3.8, rating: 4.8 },
      { name: 'St. Mary\'s Hospital', cases: 189, avgTime: 4.2, rating: 4.6 },
      { name: 'Regional Trauma Center', cases: 156, avgTime: 3.5, rating: 4.9 },
      { name: 'Community Health Clinic', cases: 98, avgTime: 5.1, rating: 4.3 }
    ]
  }

  const getTrendIcon = (change: number) => {
    return change > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const getTrendColor = (change: number) => {
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📊 Reports & Analytics
            </h1>
            <p className="text-gray-600">
              System-wide performance metrics and insights
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-blue-100 text-blue-800">
              <BarChart3 className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
            <Button variant="outline" disabled title="Filtering is not available yet">
              <Filter className="h-4 w-4 mr-2" />
              Filter Reports
            </Button>
            <Button disabled title="Export is not available yet">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Sample-data notice: the metrics below are illustrative placeholders,
            not live system data. The dashboard uses this banner so a reviewer is
            not misled into treating these numbers as real operational metrics. */}
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Sample data:</strong> The figures on this page are illustrative placeholders and do
                not reflect live system activity. For real, live metrics use the Analytics dashboard.
              </p>
            </div>
            <Link href="/admin/analytics">
              <Button variant="outline" className="whitespace-nowrap">
                <BarChart3 className="h-4 w-4 mr-2" />
                Go to Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">From:</label>
                <Input type="date" className="w-40" defaultValue="2024-01-01" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">To:</label>
                <Input type="date" className="w-40" defaultValue="2024-06-30" />
              </div>
              <Button variant="outline" disabled title="Filtering is not available yet">Apply Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emergencies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.overview.totalEmergencies.toLocaleString()}</div>
              <div className="flex items-center text-xs">
                {getTrendIcon(reportData.trends.emergenciesChange)}
                <span className={`ml-1 ${getTrendColor(reportData.trends.emergenciesChange)}`}>
                  {Math.abs(reportData.trends.emergenciesChange)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.overview.avgResponseTime} min</div>
              <div className="flex items-center text-xs">
                {getTrendIcon(reportData.trends.responseTimeChange)}
                <span className={`ml-1 ${getTrendColor(reportData.trends.responseTimeChange)}`}>
                  {Math.abs(reportData.trends.responseTimeChange)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reportData.overview.successRate}%</div>
              <div className="flex items-center text-xs">
                {getTrendIcon(reportData.trends.successRateChange)}
                <span className={`ml-1 ${getTrendColor(reportData.trends.successRateChange)}`}>
                  {Math.abs(reportData.trends.successRateChange)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Ambulances</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{reportData.overview.activeAmbulances}</div>
              <div className="flex items-center text-xs">
                {getTrendIcon(reportData.trends.ambulancesChange)}
                <span className={`ml-1 ${getTrendColor(reportData.trends.ambulancesChange)}`}>
                  {Math.abs(reportData.trends.ambulancesChange)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Monthly Emergency Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.monthlyStats.map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{month.month}</span>
                      </div>
                      <div>
                        <div className="font-semibold">{month.emergencies} Emergencies</div>
                        <div className="text-sm text-gray-600">
                          {month.responseTime} min avg • {month.successRate}% success
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Performance</div>
                      <div className={`font-semibold ${month.successRate > 94 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {month.successRate > 94 ? 'Excellent' : 'Good'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Emergency Types Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.emergencyTypes.map((type, index) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full bg-${['red', 'blue', 'yellow', 'green', 'purple'][index]}-500`}></div>
                      <span className="font-medium">{type.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{type.count}</div>
                      <div className="text-sm text-gray-500">{type.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hospital Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Hospital Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.hospitalPerformance.map((hospital, index) => (
                <div key={hospital.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {hospital.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{hospital.name}</h4>
                      <div className="text-sm text-gray-600">
                        {hospital.cases} cases handled • {hospital.avgTime} min avg response
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm text-gray-500">Rating:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        ⭐ {hospital.rating}/5.0
                      </Badge>
                    </div>
                    <div className={`text-sm font-medium ${hospital.avgTime < 4 ? 'text-green-600' : hospital.avgTime < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {hospital.avgTime < 4 ? 'Excellent' : hospital.avgTime < 5 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col" disabled title="Report generation is not available yet">
                <FileText className="h-6 w-6 mb-2" />
                Emergency Report
              </Button>
              <Button variant="outline" className="h-20 flex-col" disabled title="Report generation is not available yet">
                <Building2 className="h-6 w-6 mb-2" />
                Hospital Analysis
              </Button>
              <Button variant="outline" className="h-20 flex-col" disabled title="Report generation is not available yet">
                <Truck className="h-6 w-6 mb-2" />
                Fleet Performance
              </Button>
              <Button variant="outline" className="h-20 flex-col" disabled title="Report generation is not available yet">
                <Users className="h-6 w-6 mb-2" />
                Staff Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
