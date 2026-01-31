'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActiveAnnouncements } from '@/hooks/useAnnouncements'

export function LandingAnnouncementBanner() {
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
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2">
            <span className="font-bold text-white text-sm sm:text-base">{current.title}:</span>
            <span className="text-white/90 text-sm sm:text-base">
              {current.message}
            </span>
            {current.link_url && (
              <a
                href={current.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-yellow-200 hover:text-yellow-100 underline text-sm font-medium"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
              <span className="text-xs text-white/80 hidden sm:inline">
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
            className="h-7 w-7 p-0 text-white hover:bg-white/20 ml-1"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

