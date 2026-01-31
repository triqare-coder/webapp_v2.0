'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MapPin, Loader2, Search, Navigation } from 'lucide-react'

// Extend Window interface for Google Maps
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any
    initGoogleMaps?: () => void
  }
}

interface LocationPickerProps {
  latitude: string
  longitude: string
  onLocationChange: (lat: string, lng: string) => void
  disabled?: boolean
  label?: string
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
  label = 'Select Location'
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [tempLat, setTempLat] = useState(latitude || '28.6139')
  const [tempLng, setTempLng] = useState(longitude || '77.2090')
  
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null)

  // Load Google Maps script
  useEffect(() => {
    if (!isOpen) return
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('Google Maps API key not configured')
      return
    }

    if (window.google?.maps) {
      setIsLoaded(true)
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      if (window.google?.maps) {
        setIsLoaded(true)
      } else {
        existingScript.addEventListener('load', () => setIsLoaded(true))
      }
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => setIsLoaded(true)
    script.onerror = () => setError('Failed to load Google Maps')
    document.head.appendChild(script)
  }, [isOpen])

  // Initialize map when dialog opens
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !isOpen) return

    const initLat = parseFloat(tempLat) || 28.6139
    const initLng = parseFloat(tempLng) || 77.2090

    const map = new window.google!.maps.Map(mapRef.current, {
      center: { lat: initLat, lng: initLng },
      zoom: 15,
      mapId: 'location_picker_map',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    })

    mapInstanceRef.current = map
    geocoderRef.current = new window.google!.maps.Geocoder()

    // Create draggable marker
    const markerElement = document.createElement('div')
    markerElement.innerHTML = `
      <div style="background: #ef4444; padding: 8px; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `

    const marker = new window.google!.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: initLat, lng: initLng },
      content: markerElement,
      gmpDraggable: true,
      title: 'Drag to select location'
    })

    markerRef.current = marker

    // Update coordinates when marker is dragged
    marker.addListener('dragend', () => {
      const position = marker.position as { lat: number; lng: number }
      if (position) {
        setTempLat(position.lat.toFixed(6))
        setTempLng(position.lng.toFixed(6))
      }
    })

    // Click on map to move marker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.addListener('click', (e: any) => {
      if (e.latLng) {
        marker.position = e.latLng
        setTempLat(e.latLng.lat().toFixed(6))
        setTempLng(e.latLng.lng().toFixed(6))
      }
    })

    return () => {
      mapInstanceRef.current = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isOpen])

  // Search for location
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !geocoderRef.current) return

    setIsSearching(true)
    try {
      const result = await geocoderRef.current.geocode({ address: searchQuery })
      if (result.results[0]) {
        const location = result.results[0].geometry.location
        const lat = location.lat()
        const lng = location.lng()

        setTempLat(lat.toFixed(6))
        setTempLng(lng.toFixed(6))

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng })
          mapInstanceRef.current.setZoom(15)
          markerRef.current.position = { lat, lng }
        }
      }
    } catch {
      console.error('Geocoding failed')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Get current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setTempLat(lat.toFixed(6))
        setTempLng(lng.toFixed(6))

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng })
          mapInstanceRef.current.setZoom(15)
          markerRef.current.position = { lat, lng }
        }
      },
      (error) => console.error('Geolocation error:', error)
    )
  }

  // Confirm selection
  const handleConfirm = () => {
    onLocationChange(tempLat, tempLng)
    setIsOpen(false)
  }

  // Reset temp values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTempLat(latitude || '28.6139')
      setTempLng(longitude || '77.2090')
    }
  }, [isOpen, latitude, longitude])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onLocationChange(e.target.value, longitude)}
            disabled={disabled}
            placeholder="Latitude"
          />
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onLocationChange(latitude, e.target.value)}
            disabled={disabled}
            placeholder="Longitude"
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled}>
              <MapPin className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Select Location on Map
              </DialogTitle>
            </DialogHeader>

            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button type="button" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
              <Button type="button" variant="outline" onClick={handleGetCurrentLocation} title="Use current location">
                <Navigation className="h-4 w-4" />
              </Button>
            </div>

            {/* Map Container */}
            {error ? (
              <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
                <p className="text-red-500">{error}</p>
              </div>
            ) : !isLoaded ? (
              <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div ref={mapRef} className="h-[400px] rounded-lg border" />
            )}

            {/* Coordinates Display */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="text-gray-500">Selected:</span>{' '}
                <span className="font-mono font-medium">{tempLat}, {tempLng}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirm}>
                  Confirm Location
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Click on the map or drag the marker to select a location
            </p>
          </DialogContent>
        </Dialog>
      </div>
      {latitude && longitude && (
        <p className="text-xs text-gray-500">
          📍 {latitude}, {longitude}
        </p>
      )}
    </div>
  )
}

