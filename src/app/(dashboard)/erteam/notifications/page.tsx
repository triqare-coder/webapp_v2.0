'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Clock,
  Settings,
  Check,
  Trash2,
  Filter,
  BellRing,
  MessageSquare,
  Zap,
  Users,
  Truck
} from 'lucide-react'

interface Notification {
  id: string
  type: 'emergency' | 'system' | 'assignment' | 'maintenance' | 'info'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionRequired: boolean
  source: string
}

export default function ERTNotificationsPage() {
  const [filter, setFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'emergency',
      priority: 'high',
      title: 'New Emergency Alert',
      message: 'Cardiac emergency reported at 123 Main St. Immediate response required.',
      timestamp: '2 minutes ago',
      read: false,
      actionRequired: true,
      source: 'Emergency Dispatch'
    },
    {
      id: '2',
      type: 'assignment',
      priority: 'medium',
      title: 'Driver Assignment Update',
      message: 'Mike Johnson has been assigned to AMB-001 for the next shift.',
      timestamp: '15 minutes ago',
      read: false,
      actionRequired: false,
      source: 'Fleet Management'
    },
    {
      id: '3',
      type: 'system',
      priority: 'low',
      title: 'System Maintenance Complete',
      message: 'Scheduled maintenance on communication systems has been completed successfully.',
      timestamp: '1 hour ago',
      read: true,
      actionRequired: false,
      source: 'System Admin'
    },
    {
      id: '4',
      type: 'maintenance',
      priority: 'medium',
      title: 'Vehicle Maintenance Due',
      message: 'AMB-003 is due for scheduled maintenance. Please schedule service appointment.',
      timestamp: '2 hours ago',
      read: false,
      actionRequired: true,
      source: 'Fleet Management'
    },
    {
      id: '5',
      type: 'info',
      priority: 'low',
      title: 'Training Session Reminder',
      message: 'Monthly emergency response training scheduled for tomorrow at 10:00 AM.',
      timestamp: '3 hours ago',
      read: true,
      actionRequired: false,
      source: 'Training Department'
    },
    {
      id: '6',
      type: 'emergency',
      priority: 'high',
      title: 'Multi-Vehicle Accident',
      message: 'Major accident on Highway 101. Multiple units dispatched. Coordinate with fire department.',
      timestamp: '4 hours ago',
      read: true,
      actionRequired: false,
      source: 'Emergency Dispatch'
    }
  ])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'system':
        return <Settings className="h-5 w-5 text-blue-600" />
      case 'assignment':
        return <Users className="h-5 w-5 text-green-600" />
      case 'maintenance':
        return <Truck className="h-5 w-5 text-orange-600" />
      case 'info':
        return <Info className="h-5 w-5 text-gray-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-100 text-red-800'
      case 'system':
        return 'bg-blue-100 text-blue-800'
      case 'assignment':
        return 'bg-green-100 text-green-800'
      case 'maintenance':
        return 'bg-orange-100 text-orange-800'
      case 'info':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesType = filter === 'all' || notification.type === filter
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter
    return matchesType && matchesPriority
  })

  const unreadCount = notifications.filter(n => !n.read).length
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length
  const actionRequiredCount = notifications.filter(n => n.actionRequired && !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="h-6 w-6 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-100 text-red-800">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-gray-600">Stay updated with system alerts and important messages</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <BellRing className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{highPriorityCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Action Required</p>
                <p className="text-2xl font-bold text-orange-600">{actionRequiredCount}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="info">Information</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`hover:shadow-md transition-shadow ${
              !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <Badge className={getTypeColor(notification.type)}>
                        {notification.type}
                      </Badge>
                      <Badge className={getPriorityColor(notification.priority)}>
                        {notification.priority}
                      </Badge>
                      {notification.actionRequired && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <Zap className="h-3 w-3 mr-1" />
                          Action Required
                        </Badge>
                      )}
                      {!notification.read && (
                        <Badge className="bg-blue-100 text-blue-800">
                          New
                        </Badge>
                      )}
                    </div>
                    
                    <p className={`text-sm ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {notification.timestamp}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {notification.source}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  {!notification.read && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p>Try adjusting your filters or check back later for new notifications.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
