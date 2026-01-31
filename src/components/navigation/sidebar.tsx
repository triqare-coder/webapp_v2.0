'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavigationForRole, getProfileNavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { UserRole } from '@/types'
import { SignOutButton } from '@clerk/nextjs'
import { Logo } from '@/components/ui/logo'

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Determine role based on current path
  const getCurrentRole = (): UserRole => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/erteam')) return 'ert'
    if (pathname.startsWith('/transport')) return 'transport_company'
    return 'admin' // default
  }

  const role = getCurrentRole()

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const navigationItems = getNavigationForRole(role)
  const profileNavItem = getProfileNavItem(role)

  const renderNavItem = (item: any, level = 0) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.href)
    const Icon = item.icon

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
            level > 0 && "ml-4 border-l-2 border-gray-200 pl-4",
            isActive
              ? "bg-blue-100 text-blue-700 border-blue-200"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.href)
            }
          }}
        >
          <Link
            href={hasChildren ? '#' : item.href}
            className="flex items-center flex-1"
            onClick={(e) => hasChildren && e.preventDefault()}
          >
            <Icon className="mr-3 h-4 w-4" />
            <span>{item.title}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
          {hasChildren && (
            <div className="ml-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children.map((child: any) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" showText={false} />
        </div>

        {/* Role Badge */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Current Role
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {role === 'admin' && '🛡️ System Administrator'}
            {role === 'ert' && '🚨 Emergency Response Team'}
            {role === 'transport_company' && '🚛 Transport Company'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => renderNavItem(item))}
        </nav>

        {/* User Profile */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link href={profileNavItem.href} className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{profileNavItem.title}</div>
              <div className="text-xs text-gray-500">{profileNavItem.description}</div>
            </div>
          </Link>
        </div>

        {/* Logout Button */}
        <div className="mt-4">
          <SignOutButton>
            <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
