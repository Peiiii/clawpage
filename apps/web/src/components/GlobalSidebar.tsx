import { X } from 'lucide-react'
import { useSidebarStore } from '@/store/sidebarStore'
import { cn } from '@/lib/utils'

export function GlobalSidebar() {
  const { isOpen, title, content, width, closeSidebar } = useSidebarStore()

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 bg-background/95 backdrop-blur-xl border-l border-border/50',
        'flex flex-col shadow-2xl shadow-black/20',
        'transition-all duration-300 ease-out overflow-hidden',
        isOpen ? 'w-[var(--sidebar-width)] opacity-100' : 'w-0 opacity-0'
      )}
      style={{ '--sidebar-width': width } as React.CSSProperties}
    >
      {/* Header */}
      {title && (
        <header className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <h3 className="font-semibold text-base truncate pr-4">{title}</h3>
          <button
            onClick={closeSidebar}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-w-[300px]">
        {content}
      </div>
    </aside>
  )
}
