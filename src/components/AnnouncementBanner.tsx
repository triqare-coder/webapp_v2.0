'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActiveAnnouncements } from '@/hooks/useAnnouncements'

export function AnnouncementBanner() {
  const { announcements, loading } = useActiveAnnouncements()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // Load dismissed announcements from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedAnnouncements')
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  )

  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentIndex >= visibleAnnouncements.length && visibleAnnouncements.length > 0) {
      setCurrentIndex(0)
    }
  }, [visibleAnnouncements.length, currentIndex])

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id]
    setDismissedIds(newDismissed)
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed))
  }

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? visibleAnnouncements.length - 1 : prev - 1
    )
  }

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === visibleAnnouncements.length - 1 ? 0 : prev + 1
    )
  }

  if (loading || visibleAnnouncements.length === 0) {
    return null
  }

  const current = visibleAnnouncements[currentIndex]

  if (!current) {
    return null
  }

  return (
    <div className="bg-blue-600 text-white px-4 py-3 relative">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Megaphone className="h-5 w-5 flex-shrink-0 text-white" />
          <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2">
            <span className="font-bold text-white">{current.title}:</span>
            <span className="text-white/90">
              {current.message}
            </span>
            {current.link_url && (
              <a
                href={current.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white hover:text-white/80 underline"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {visibleAnnouncements.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-7 w-7 p-0 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-white/80">
                {currentIndex + 1}/{visibleAnnouncements.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-7 w-7 p-0 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(current.id)}
            className="h-7 w-7 p-0 text-white hover:bg-white/20 ml-2"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

