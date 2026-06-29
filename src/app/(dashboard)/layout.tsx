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
      {/* Soft Healthcare shell: calm gradient canvas + floating rounded sidebar */}
      <div className="flex min-h-screen gap-4 bg-gradient-to-b from-[#eef2f7] to-[#f7f9fb] p-4">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          <AnnouncementBanner />
          <div className="mx-auto w-full max-w-7xl px-1 py-1">
            {children}
          </div>
        </main>
      </div>
    </DashboardAuthGuard>
  )
}
