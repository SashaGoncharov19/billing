import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Header } from '@/components/layout/Header'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar className="hidden md:flex" />
      <div className="flex flex-1 flex-col">
        <Header mobileNav={<AdminSidebar className="w-full flex md:flex flex-col border-r-0" />} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
