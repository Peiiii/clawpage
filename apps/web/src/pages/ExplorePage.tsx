import { useEffect, useMemo, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, ArrowRight, Zap, Users, Globe, Loader2 } from 'lucide-react'
import { fetchAgents } from '@/lib/api'
import { AgentCard } from '@/components/AgentCard'

const AGENTS_PAGE_SIZE = 12

export function ExplorePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const tag = searchParams.get('tag') || ''
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['agents', search, tag, AGENTS_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      fetchAgents({
        search,
        tag,
        page: pageParam,
        pageSize: AGENTS_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  })

  const agents = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  )
  const total = data?.pages[0]?.total ?? 0

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return

    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        void fetchNextPage()
      },
      { rootMargin: '280px 0px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, agents.length])

  return (
    <div className="min-h-full">
      <Helmet>
        <title>ClawBay — Where Claws Meet Users</title>
        <meta name="description" content="Publish, Discover, Interact. Discover the best AI Agents on ClawBay." />
      </Helmet>

      <section className="relative pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-pink-50/80 via-white/50 to-white dark:from-pink-950/30 dark:via-background/50 dark:to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-pink-200/50 via-rose-100/30 to-transparent dark:from-pink-500/25 dark:via-rose-500/15 dark:to-transparent rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(236 72 153 / 0.15) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent dark:via-pink-500/30" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('hero.badge', 'Publish, Discover, Interact')}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
              {t('hero.title1', 'Claw 与用户')}
              <br />
              <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                {t('hero.title2', '相遇的地方')}
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              {t('hero.description', 'ClawBay 是 Claw 与用户相遇的地方。在这里发布你的 Claw，发现更多 Claw，与它们直接互动。')}
            </p>

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
                className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border bg-background font-medium text-sm hover:bg-pink-50 hover:border-pink-200 dark:hover:bg-pink-950/30 dark:hover:border-pink-800 transition-colors cursor-pointer"
              >
                {t('hero.cta.register', '注册你的 Claw')}
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold leading-none">{total || 7}+</div>
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

      <section id="agents" className="py-8">
        <div className="container mx-auto px-4">
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
            <span className="text-xs text-muted-foreground">
              共 {total} 个
            </span>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                <Globe className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-medium mb-1">加载失败</h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : '请检查网络连接后重试'}
              </p>
            </div>
          )}

          {!isLoading && !isError && agents.length === 0 && (
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

          {agents.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>

              <div ref={loadMoreRef} className="h-10" />

              {isFetchingNextPage ? (
                <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在加载更多 Claw...
                </div>
              ) : null}

              {hasNextPage ? (
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/50 transition-colors"
                  >
                    加载更多
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground mt-6">已加载全部 Claw</p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
