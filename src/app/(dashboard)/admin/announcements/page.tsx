'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { useServerPagination } from '@/hooks/useServerPagination'
import {
  Megaphone,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '@/hooks/useAnnouncements'
import { Announcement, CreateAnnouncementInput, UpdateAnnouncementInput } from '@/services/announcementService'

export default function AnnouncementsPage() {
  // Pagination state
  const { currentPage, pageSize, setCurrentPage, setPageSize } = useServerPagination()

  const { announcements, loading, error, count, refetch } = useAnnouncements({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  })
  const { createAnnouncement, loading: creating } = useCreateAnnouncement()
  const { updateAnnouncement, loading: updating } = useUpdateAnnouncement()
  const { deleteAnnouncement, loading: deleting } = useDeleteAnnouncement()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateAnnouncementInput>({
    title: '',
    message: '',
    link_url: '',
    is_active: true,
    start_at: '',
    end_at: '',
  })

  const resetForm = () => {
    setFormData({ title: '', message: '', link_url: '', is_active: true, start_at: '', end_at: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      link_url: announcement.link_url || '',
      is_active: announcement.is_active,
      start_at: announcement.start_at ? announcement.start_at.slice(0, 16) : '',
      end_at: announcement.end_at ? announcement.end_at.slice(0, 16) : '',
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and message are required')
      return
    }

    const data = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      link_url: formData.link_url?.trim() || null,
      is_active: formData.is_active,
      start_at: formData.start_at || null,
      end_at: formData.end_at || null,
    }

    let result
    if (editingId) {
      result = await updateAnnouncement(editingId, data as UpdateAnnouncementInput)
      if (result) toast.success('Announcement updated successfully')
    } else {
      result = await createAnnouncement(data as CreateAnnouncementInput)
      if (result) toast.success('Announcement created successfully')
    }

    if (result) {
      resetForm()
      refetch()
    } else {
      toast.error('Failed to save announcement')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    
    const success = await deleteAnnouncement(id)
    if (success) {
      toast.success('Announcement deleted successfully')
      refetch()
    } else {
      toast.error('Failed to delete announcement')
    }
  }

  const handleToggleStatus = async (announcement: Announcement) => {
    const result = await updateAnnouncement(announcement.id, { is_active: !announcement.is_active })
    if (result) {
      toast.success(`Announcement ${result.is_active ? 'activated' : 'deactivated'}`)
      refetch()
    }
  }

  const isAnnouncementActive = (announcement: Announcement) => {
    if (!announcement.is_active) return false
    const now = new Date()
    if (announcement.start_at && new Date(announcement.start_at) > now) return false
    if (announcement.end_at && new Date(announcement.end_at) < now) return false
    return true
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Announcements
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system-wide announcements visible to all users
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update the announcement details' : 'Create a new announcement for all users'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_url">Link URL (optional)</Label>
                <Input
                  id="link_url"
                  value={formData.link_url || ''}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://example.com/more-info"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter the announcement message..."
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start_at">Start Date (optional)</Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={formData.start_at || ''}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_at">End Date (optional)</Label>
                <Input
                  id="end_at"
                  type="datetime-local"
                  value={formData.end_at || ''}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Announcement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
          <CardDescription>
            {count} announcement{count !== 1 ? 's' : ''} in total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No announcements yet. Click &quot;New Announcement&quot; to create one.
            </p>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        {isAnnouncementActive(announcement) ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {announcement.link_url && (
                          <a href={announcement.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{announcement.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                        {announcement.start_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Start: {new Date(announcement.start_at).toLocaleDateString()}
                          </span>
                        )}
                        {announcement.end_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            End: {new Date(announcement.end_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() => handleToggleStatus(announcement)}
                        disabled={updating}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(announcement)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(announcement.id)} disabled={deleting}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {count > 0 && (
            <div className="mt-6">
              <PaginationWithInfo
                currentPage={currentPage}
                totalPages={Math.ceil(count / pageSize)}
                onPageChange={setCurrentPage}
                hasNextPage={currentPage < Math.ceil(count / pageSize)}
                hasPreviousPage={currentPage > 1}
                startIndex={count > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                endIndex={Math.min(currentPage * pageSize, count)}
                totalItems={count}
                pageSize={pageSize}
                pageSizeOptions={[5, 10, 20, 50, 100]}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

