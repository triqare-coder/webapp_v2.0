'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  type: 'driver' | 'patient' | 'hospital'
  name: string
  status?: string
  info?: string
}

interface LiveTrackingMapProps {
  markers: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick?: (marker: MapMarker) => void
  className?: string
}

// Marker icon configurations by type
const markerIcons: Record<string, { color: string; label: string; scale: number }> = {
  driver: { color: '#22c55e', label: '🚑', scale: 1.2 },
  patient: { color: '#3b82f6', label: '🧑', scale: 1 },
  hospital: { color: '#ef4444', label: '🏥', scale: 1.3 }
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any
  }
}

export default function LiveTrackingMap({
  markers,
  center = { lat: 28.6139, lng: 77.2090 }, // Default: Delhi, India
  zoom = 12,
  onMarkerClick,
  className = ''
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('Google Maps API key not configured')
      return
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setIsLoaded(true)
      return
    }

    // Check if script is already in the document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      // Script exists, wait for it to load
      if (window.google?.maps) {
        setIsLoaded(true)
      } else {
        existingScript.addEventListener('load', () => setIsLoaded(true))
      }
      return
    }

    // Create and add new script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => setIsLoaded(true)
    script.onerror = () => setError('Failed to load Google Maps')
    document.head.appendChild(script)
  }, [])

  // Initialize map
  useEffect(() => {
    console.log('=== Map Init useEffect ===')
    console.log('isLoaded:', isLoaded)
    console.log('mapRef.current:', !!mapRef.current)
    console.log('mapInstanceRef.current:', !!mapInstanceRef.current)
    console.log('window.google:', !!window.google)

    if (!isLoaded || !mapRef.current || mapInstanceRef.current || !window.google) {
      console.log('Skipping map init - conditions not met')
      return
    }

    try {
      console.log('Creating map instance...')
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        // mapId is needed for Advanced Markers - use DEMO_MAP_ID for testing
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      })
      console.log('Map instance created successfully')

      infoWindowRef.current = new window.google.maps.InfoWindow()
      console.log('InfoWindow created')
    } catch (err) {
      setError('Failed to initialize map')
      console.error('Map init error:', err)
    }
  }, [isLoaded, center, zoom])

  // Create custom marker element
  const createMarkerElement = useCallback((marker: MapMarker) => {
    const config = markerIcons[marker.type] || markerIcons.patient

    const el = document.createElement('div')
    el.className = 'custom-marker'
    el.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: scale(${config.scale});
      ">
        <div style="
          background: ${config.color};
          border: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">${config.label}</div>
        <div style="
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          margin-top: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          white-space: nowrap;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">${marker.name}</div>
      </div>
    `
    return el
  }, [])

  // Update markers
  useEffect(() => {
    console.log('=== LiveTrackingMap useEffect ===')
    console.log('isLoaded:', isLoaded)
    console.log('mapInstanceRef.current:', !!mapInstanceRef.current)
    console.log('window.google:', !!window.google)
    console.log('markers count:', markers.length)

    if (!mapInstanceRef.current || !isLoaded || !window.google) {
      console.log('Skipping marker update - conditions not met')
      return
    }

    console.log('Processing markers...')

    // Clear existing markers
    markersRef.current.forEach(m => m.map = null)
    markersRef.current = []

    // Add new markers
    markers.forEach((marker, index) => {
      console.log(`Adding marker ${index}:`, marker.name, marker.type, marker.lat, marker.lng)

      try {
        const config = markerIcons[marker.type] || markerIcons.patient

        // Try Advanced Marker first, fall back to regular Marker
        let mapMarker: any

        if (window.google.maps.marker?.AdvancedMarkerElement) {
          const markerEl = createMarkerElement(marker)
          mapMarker = new window.google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: { lat: marker.lat, lng: marker.lng },
            content: markerEl,
            title: marker.name
          })
        } else {
          // Fallback to regular Marker
          console.log('Using fallback regular Marker')
          mapMarker = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: { lat: marker.lat, lng: marker.lng },
            title: marker.name,
            label: {
              text: config.label,
              fontSize: '16px'
            }
          })
        }

        mapMarker.addListener('click', () => {
          if (infoWindowRef.current && mapInstanceRef.current) {
            infoWindowRef.current.setContent(`
              <div style="padding: 8px; min-width: 150px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${marker.name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
                  <span style="background: ${config.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                    ${marker.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                ${marker.status ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">Status: ${marker.status}</div>` : ''}
                ${marker.info ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${marker.info}</div>` : ''}
              </div>
            `)
            infoWindowRef.current.open(mapInstanceRef.current, mapMarker)
          }
          onMarkerClick?.(marker)
        })

        markersRef.current.push(mapMarker)
        console.log(`Marker ${index} added successfully`)
      } catch (err) {
        console.error(`Error adding marker ${index}:`, err)
      }
    })
  }, [markers, isLoaded, createMarkerElement, onMarkerClick])

  // Center map to fit all markers
  const fitBounds = useCallback(() => {
    if (!mapInstanceRef.current || markers.length === 0 || !window.google) return

    const bounds = new window.google.maps.LatLngBounds()
    markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }))
    mapInstanceRef.current.fitBounds(bounds)

    const listener = window.google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
      const currentZoom = mapInstanceRef.current?.getZoom()
      if (currentZoom && currentZoom > 15) {
        mapInstanceRef.current?.setZoom(15)
      }
      window.google.maps.event.removeListener(listener)
    })
  }, [markers])

  // Auto fit bounds when markers change
  useEffect(() => {
    if (markers.length > 0 && mapInstanceRef.current) {
      fitBounds()
    }
  }, [markers.length, fitBounds])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ minHeight: '400px' }}>
        <div className="text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <p className="text-gray-500 text-sm mt-2">Please check your Google Maps API key configuration</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ minHeight: '400px' }}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading map...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: '400px' }} />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <div className="text-xs font-semibold mb-2">Map Legend</div>
        <div className="space-y-1 text-xs">
          {Object.entries(markerIcons).map(([type, config]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                style={{ background: config.color }}
              >
                {config.label}
              </div>
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
