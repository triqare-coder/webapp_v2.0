import { supabase } from '@/lib/supabase'

export interface Announcement {
  id: string
  title: string
  message: string
  link_url: string | null
  is_active: boolean
  start_at: string | null
  end_at: string | null
  created_at: string
}

export interface CreateAnnouncementInput {
  title: string
  message: string
  link_url?: string | null
  is_active?: boolean
  start_at?: string | null
  end_at?: string | null
}

export interface UpdateAnnouncementInput {
  title?: string
  message?: string
  link_url?: string | null
  is_active?: boolean
  start_at?: string | null
  end_at?: string | null
}

class AnnouncementService {
  async getAnnouncements(options?: { limit?: number; offset?: number }): Promise<{ announcements: Announcement[]; count: number }> {
    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset !== undefined) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching announcements:', error)
      throw error
    }

    return { announcements: data || [], count: count || 0 }
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    // Get all active announcements and filter in JS for date range
    // This avoids complex Supabase query issues with combined OR conditions
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active announcements:', error)
      throw error
    }

    // Filter by date range in JavaScript
    const now = new Date()
    const filtered = (data || []).filter((announcement) => {
      // Check start_at: must be null or in the past
      if (announcement.start_at && new Date(announcement.start_at) > now) {
        return false
      }
      // Check end_at: must be null or in the future
      if (announcement.end_at && new Date(announcement.end_at) < now) {
        return false
      }
      return true
    })

    return filtered
  }

  async getAnnouncementById(id: string): Promise<Announcement | null> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching announcement:', error)
      return null
    }

    return data
  }

  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement | null> {
    const { data, error } = await supabase
      .from('announcements')
      .insert([input])
      .select()
      .single()

    if (error) {
      console.error('Error creating announcement:', error)
      throw error
    }

    return data
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementInput): Promise<Announcement | null> {
    const { data, error } = await supabase
      .from('announcements')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating announcement:', error)
      throw error
    }

    return data
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting announcement:', error)
      return false
    }

    return true
  }

  async toggleAnnouncementStatus(id: string, is_active: boolean): Promise<Announcement | null> {
    return this.updateAnnouncement(id, { is_active })
  }
}

export const announcementService = new AnnouncementService()

