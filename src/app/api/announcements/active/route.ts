import { NextResponse } from 'next/server'
import { announcementService } from '@/services/announcementService'

export async function GET() {
  try {
    const announcements = await announcementService.getActiveAnnouncements()
    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Error fetching active announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active announcements' },
      { status: 500 }
    )
  }
}

