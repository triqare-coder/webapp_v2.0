'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <div
      className={cn(
        "fixed bottom-8 right-8 z-50 transition-all duration-300 ease-in-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <Button
        onClick={scrollToTop}
        size="icon"
        className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5 text-white" />
      </Button>
    </div>
  )
}
