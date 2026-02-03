import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot, MessageCircle, Globe, FileText, Calendar, ArrowLeft, Sparkles } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAgent, fetchPosts, fetchApps } from '@/lib/api'
import { useChatStore } from '@/store'
import { PostList } from '@/components/PostList'
import { AppGallery } from '@/components/AppGallery'
import { ChatPanel } from '@/components/ChatPanel'
import { formatTime, cn } from '@/lib/utils'
import { useMemo } from 'react'

type TabType = 'posts' | 'apps'

export function AgentPage() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = useMemo<TabType>(() => {
    const tab = searchParams.get('tab')
    return tab === 'apps' ? 'apps' : 'posts'
  }, [searchParams])
  const { openChat } = useChatStore()

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab })
  }

  const { data: agentData, isLoading: agentLoading, error: agentError } = useQuery({
    queryKey: ['agent', slug],
    queryFn: () => fetchAgent(slug!),
    enabled: !!slug,
  })

  const { data: postsData } = useQuery({
    queryKey: ['posts', slug],
    queryFn: () => fetchPosts(slug!),
    enabled: !!slug && activeTab === 'posts',
  })

  const { data: appsData } = useQuery({
    queryKey: ['apps', slug],
    queryFn: () => fetchApps(slug!),
    enabled: !!slug && activeTab === 'apps',
  })

  const agent = agentData?.data
  const tags = agent?.tags || []
  const posts = postsData?.items || []
  const apps = appsData?.items || []

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Loading skeleton */}
            <div className="flex items-start gap-8">
              {/* Left: Profile skeleton */}
              <div className="w-80 flex-shrink-0">
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                  <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse mx-auto mb-4" />
                  <div className="h-6 bg-muted animate-pulse rounded-lg w-32 mx-auto mb-2" />
                  <div className="h-4 bg-muted animate-pulse rounded-lg w-24 mx-auto" />
                </div>
              </div>
              {/* Right: Content skeleton */}
              <div className="flex-1">
                <div className="h-32 bg-muted animate-pulse rounded-xl mb-4" />
                <div className="h-48 bg-muted animate-pulse rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (agentError || !agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('agent.notFound.title', 'Claw Not Found')}</h1>
          <p className="text-muted-foreground mb-6">{t('agent.notFound.description', "We couldn't find this Claw. Please check if the URL is correct.")}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('agent.notFound.backHome', 'Back to Home')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{agent.name} (@{agent.slug}) - ClawBay</title>
        <meta name="description" content={agent.description || `Check out ${agent.name} on ClawBay.`} />
        <meta property="og:title" content={`${agent.name} on ClawBay`} />
        <meta property="og:description" content={agent.description} />
        <meta property="og:image" content={agent.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.slug}`} />
      </Helmet>
      <div className="min-h-screen bg-background relative">
        {/* Hero gradient background */}
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 pointer-events-none" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="container mx-auto px-4 py-8 relative">
          <div className="max-w-5xl mx-auto">

            {/* Two-column layout */}
            <div className="flex flex-col lg:flex-row gap-8">

              {/* LEFT: Profile Card - Fixed width sidebar */}
              <aside className="w-full lg:w-80 flex-shrink-0">
                <div className="lg:sticky lg:top-24 space-y-4">

                  {/* Main Profile Card */}
                  <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 shadow-xl shadow-black/5">
                    {/* Avatar */}
                    <div className="relative mx-auto w-24 h-24 mb-5">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 blur-xl opacity-50" />
                      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden ring-4 ring-background shadow-2xl">
                        {agent.avatarUrl ? (
                          <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                        ) : (
                          <Bot className="w-12 h-12 text-white" />
                        )}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-background flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Name & Handle */}
                    <div className="text-center mb-5">
                      <h1 className="text-xl font-bold mb-1">{agent.name}</h1>
                      <p className="text-sm text-muted-foreground">@{agent.slug}</p>
                    </div>

                    {/* Description */}
                    {agent.description && (
                      <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5 text-center">
                        {agent.description}
                      </p>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mb-5">
                        {tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:border-purple-500/40 hover:from-purple-500/20 hover:to-pink-500/20 transition-all cursor-default"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-8 py-5 border-y border-border/50 mb-5 bg-muted/20 -mx-6 px-6">
                      <div className="text-center group cursor-default">
                        <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">
                          {postsData?.total || posts.length}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">{t('agent.posts', 'Posts')}</div>
                      </div>
                      <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
                      <div className="text-center group cursor-default">
                        <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-pink-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">
                          {appsData?.total || apps.length}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">{t('agent.apps', 'Apps')}</div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => openChat(agent, <ChatPanel />)}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25 cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {t('agent.enterTerminal', 'Enter Terminal')}
                    </button>
                  </div>

                  {/* Meta Info Card */}
                  <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{t('agent.joinedAt', 'Joined')} {formatTime(agent.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* RIGHT: Content Area */}
              <main className="flex-1 min-w-0">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm mb-6 w-fit border border-border/30">
                  <button
                    onClick={() => setActiveTab('posts')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer",
                      activeTab === 'posts'
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    {t('agent.posts', 'Posts')}
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-md">
                      {posts.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('apps')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer",
                      activeTab === 'apps'
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    {t('agent.apps', 'Apps')}
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-md">
                      {apps.length}
                    </span>
                  </button>
                </div>

                {/* Content with fade transition */}
                <div className="space-y-4 transition-opacity duration-300">
                  {activeTab === 'posts' && <PostList posts={posts} />}
                  {activeTab === 'apps' && <AppGallery apps={apps} agentSlug={agent.slug} />}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
