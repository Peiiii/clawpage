import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, ArrowRight, Zap, Users, Globe, ChevronRight } from 'lucide-react'
import { fetchAgents } from '@/lib/api'
import { AgentCard } from '@/components/AgentCard'

export function ExplorePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const tag = searchParams.get('tag') || ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents', search, tag],
    queryFn: () => fetchAgents({ search, tag }),
  })

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>ClawBay — Where Claws Meet Users</title>
        <meta name="description" content="Publish, Discover, Interact. Discover the best AI Agents on ClawBay." />
      </Helmet>

      {/* Hero Section - Clean & Compact */}
      <section className="relative pt-16 pb-12 overflow-hidden">
        {/* Multi-layer background - Pink theme */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-pink-50/80 via-white/50 to-white dark:from-pink-950/30 dark:via-background/50 dark:to-background" />
          
          {/* Top radial gradient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-pink-200/50 via-rose-100/30 to-transparent dark:from-pink-500/25 dark:via-rose-500/15 dark:to-transparent rounded-full blur-3xl" />
          
          {/* Subtle dot pattern */}
          <div 
            className="absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(236 72 153 / 0.15) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          />
          
          {/* Horizontal fade lines */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent dark:via-pink-500/30" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('hero.badge', 'Publish, Discover, Interact')}
            </div>

            {/* Heading - Balanced size */}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
              {t('hero.title1', 'Claw 与用户')}
              <br />
              <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                {t('hero.title2', '相遇的地方')}
              </span>
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              {t('hero.description', 'ClawBay 是 Claw 与用户相遇的地方。在这里发布你的 Claw，发现更多 Claw，与它们直接互动。')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <a
                href="#agents"
                className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-pink-500 text-white font-medium text-sm hover:bg-pink-600 transition-colors cursor-pointer"
              >
                {t('hero.cta.connect', '连接 Claw')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
              <Link
                to="/register"
                className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border bg-background font-medium text-sm hover:bg-pink-50 hover:border-pink-200 transition-colors cursor-pointer"
              >
                {t('hero.cta.register', '注册你的 Claw')}
              </Link>
            </div>

            {/* Stats - Inline compact design */}
            <div className="flex items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold leading-none">{data?.total || 7}+</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.nodes', 'Claw 节点')}</div>
                </div>
              </div>
              
              <div className="w-px h-8 bg-border" />
              
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold leading-none">1K+</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.connections', '活跃连接')}</div>
                </div>
              </div>
              
              <div className="w-px h-8 bg-border" />
              
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold leading-none">10K+</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.interactions', '交互次数')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Grid */}
      <section id="agents" className="py-8">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">
                {search ? (
                  <>
                    <span className="text-muted-foreground">搜索:</span> {search}
                  </>
                ) : (
                  <>
                    热门 <span className="text-pink-500">Claw</span>
                  </>
                )}
              </h2>
            </div>
            {data && (
              <span className="text-xs text-muted-foreground">
                共 {data.total} 个
              </span>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                <Globe className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-medium mb-1">加载失败</h3>
              <p className="text-sm text-muted-foreground">请检查网络连接后重试</p>
            </div>
          )}

          {data && data.items && data.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium mb-1">
                {search ? '未找到结果' : '暂无 Claw'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search ? '请尝试其他关键词' : '成为第一个注册者！'}
              </p>
            </div>
          )}

          {data && data.items && data.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}

          {/* View all link */}
          {data && data.items && data.items.length > 0 && data.total > data.items.length && (
            <div className="flex justify-center mt-8">
              <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                查看全部 {data.total} 个 Claw
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
