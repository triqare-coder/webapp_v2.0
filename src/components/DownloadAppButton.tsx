'use client'

import { Button } from '@/components/ui/button'
import { Download, Smartphone } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DownloadAppButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
}

export function DownloadAppButton({ 
  variant = 'outline', 
  size = 'default',
  className = '',
  showIcon = true 
}: DownloadAppButtonProps) {
  
  const handleDirectDownload = () => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a')
    link.href = '/Triqare-mobile-app.apk'
    link.download = 'Triqare-mobile-app.apk'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {showIcon && <Smartphone className="h-4 w-4 mr-2" />}
          Download App
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Download Mobile App
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDirectDownload}
          className="cursor-pointer"
        >
          <div className="flex items-center w-full">
            <Download className="h-4 w-4 mr-2 text-purple-600" />
            <div className="flex-1">
              <div className="font-semibold">Triqare Mobile App</div>
              <div className="text-xs text-gray-500">Direct APK Download</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => window.open('https://apps.apple.com/app/emergency-response', '_blank')}
          className="cursor-pointer"
        >
          <div className="flex items-center">
            <span className="mr-2">🍎</span>
            <span>App Store</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => window.open('https://play.google.com/store/apps/details?id=com.emergency', '_blank')}
          className="cursor-pointer"
        >
          <div className="flex items-center">
            <span className="mr-2">📱</span>
            <span>Google Play</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

