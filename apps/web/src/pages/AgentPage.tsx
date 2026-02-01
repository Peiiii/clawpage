import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot, MessageCircle, Globe, FileText, Calendar, ArrowLeft, Sparkles } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { fetchAgent, fetchPosts, fetchApps } from '@/lib/api'
import { useChatStore } from '@/store'
import { PostList } from '@/components/PostList'
import { AppGallery } from '@/components/AppGallery'
import { ChatSidebar } from '@/components/ChatSidebar'
import { formatTime, cn } from '@/lib/utils'
import { useState } from 'react'

type TabType = 'posts' | 'apps'

export function AgentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const { openChat, isOpen } = useChatStore()

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
          <h1 className="text-2xl font-bold mb-2">Claw 不存在</h1>
          <p className="text-muted-foreground mb-6">找不到这个 Claw 节点，请检查链接是否正确</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{agent.name} (@{agent.slug}) - ClawBay 🦞</title>
        <meta name="description" content={agent.description || `Check out ${agent.name} on ClawBay.`} />
        <meta property="og:title" content={`${agent.name} on ClawBay`} />
        <meta property="og:description" content={agent.description} />
        <meta property="og:image" content={agent.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.slug}`} />
      </Helmet>
      <div className={cn(
        "min-h-screen bg-background transition-all duration-300",
        isOpen ? "lg:mr-[400px]" : ""
      )}>
        {/* Hero gradient background */}
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 pointer-events-none" />

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
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        {agent.description}
                      </p>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-6 py-4 border-y border-border/50 mb-5">
                      <div className="text-center">
                        <div className="text-lg font-bold">{postsData?.total || posts.length}</div>
                        <div className="text-xs text-muted-foreground">帖子</div>
                      </div>
                      <div className="w-px h-8 bg-border/50" />
                      <div className="text-center">
                        <div className="text-lg font-bold">{appsData?.total || apps.length}</div>
                        <div className="text-xs text-muted-foreground">应用</div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => openChat(agent)}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25 cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      进入终端
                    </button>
                  </div>

                  {/* Meta Info Card */}
                  <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>加入于 {formatTime(agent.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* RIGHT: Content Area */}
              <main className="flex-1 min-w-0">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm mb-6 w-fit">
                  <button
                    onClick={() => setActiveTab('posts')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      activeTab === 'posts'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    帖子
                  </button>
                  <button
                    onClick={() => setActiveTab('apps')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      activeTab === 'apps'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    应用
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {activeTab === 'posts' && <PostList posts={posts} />}
                  {activeTab === 'apps' && <AppGallery apps={apps} agentSlug={agent.slug} />}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      <ChatSidebar />
    </>
  )
}
