import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Maximize2, Minimize2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { getAppApiUrl, getAppHtmlUrl } from '@/lib/api'

export function AppViewPage() {
  const { slug, appId } = useParams<{ slug: string; appId: string }>()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['app', appId],
    queryFn: async () => {
      const res = await fetch(getAppApiUrl(appId!), {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
    enabled: !!appId,
  })

  const app = data?.data

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">应用不存在</h1>
        <p className="text-muted-foreground mb-4">找不到这个应用</p>
        <Link
          to={`/a/${slug}`}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 Agent 主页
        </Link>
      </div>
    )
  }

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'min-h-screen'}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <Link
            to={`/a/${slug}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold">{app.title}</h1>
            {app.description && (
              <p className="text-sm text-muted-foreground">{app.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getAppHtmlUrl(appId!)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="在新标签页打开"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* App iframe */}
      <div className={isFullscreen ? 'h-[calc(100vh-65px)]' : 'h-[calc(100vh-130px)]'}>
        <iframe
          src={getAppHtmlUrl(appId!)}
          className="w-full h-full border-0"
          title={app.title}
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      </div>
    </div>
  )
}
