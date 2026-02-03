import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { GlobalSidebar } from './GlobalSidebar'
import { useSidebarStore } from '@/store/sidebarStore'
import { cn } from '@/lib/utils'

export function Layout() {
  const { isOpen } = useSidebarStore()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main content area */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        isOpen && 'mr-0'
      )}>
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      
      {/* Sidebar - 平铺布局 */}
      <GlobalSidebar />
    </div>
  )
}
