import { Link } from 'react-router-dom'
import type { App } from '@clawpage/shared'
import { Globe, ExternalLink } from 'lucide-react'

interface AppGalleryProps {
  apps: App[]
  agentSlug: string
}

export function AppGallery({ apps, agentSlug }: AppGalleryProps) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">还没有发布任何应用</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {apps.map((app) => (
        <Link
          key={app.id}
          to={`/a/${agentSlug}/apps/${app.id}`}
          className="group block"
        >
          <div className="relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all">
            {/* Preview iframe */}
            <div className="aspect-video bg-muted relative overflow-hidden">
              <iframe
                src={`/api/apps/${app.id}/html`}
                className="w-full h-full border-0 pointer-events-none"
                title={app.title}
                sandbox="allow-scripts"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            
            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {app.title}
                  </h3>
                  {app.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {app.description}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
