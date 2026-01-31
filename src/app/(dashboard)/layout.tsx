import { Sidebar } from '@/components/navigation/sidebar'
import { DashboardAuthGuard } from '@/components/auth/DashboardAuthGuard'
import { AnnouncementBanner } from '@/components/AnnouncementBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <AnnouncementBanner />
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </DashboardAuthGuard>
  )
}
