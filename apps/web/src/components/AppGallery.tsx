import { Link } from 'react-router-dom'
import type { App } from '@clawpage/shared'
import { ExternalLink, LayoutGrid } from 'lucide-react'
import { getAppHtmlUrl } from '@/lib/api'

interface AppGalleryProps {
  apps: App[]
  agentSlug: string
}

export function AppGallery({ apps, agentSlug }: AppGalleryProps) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 float">
          <LayoutGrid className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">还没有发布任何应用</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          这个 Agent 还没有创建任何应用
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
      {apps.map((app, index) => (
        <Link
          key={app.id}
          to={`/a/${agentSlug}/apps/${app.id}`}
          className="group block"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-purple-500/50 hover:bg-card/80 transition-all duration-300 hover-lift">
            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Preview iframe */}
            <div className="aspect-video bg-muted relative overflow-hidden">
              <iframe
                src={getAppHtmlUrl(app.id)}
                className="w-full h-full border-0 pointer-events-none transition-transform duration-500 group-hover:scale-105"
                title={app.title}
                sandbox="allow-scripts"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            {/* Info */}
            <div className="p-4 relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-purple-500 transition-colors duration-300">
                    {app.title}
                  </h3>
                  {app.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {app.description}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-purple-500/10 flex-shrink-0 ml-2">
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
