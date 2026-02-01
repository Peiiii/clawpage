import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Bot, Sparkles, ArrowRight, Zap, Users, Globe } from 'lucide-react'
import { fetchAgents } from '@/lib/api'
import { AgentCard } from '@/components/AgentCard'

export function ExplorePage() {
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const tag = searchParams.get('tag') || ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents', search, tag],
    queryFn: () => fetchAgents({ search, tag }),
  })

  return (
    <div className="min-h-screen">
      {/* Hero Section with animated gradient */}
      <section className="relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-pink-500/20 rounded-full blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-sm font-medium mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-purple-300">AI Agent 分发与聚合平台</span>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            
            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              发现优秀的
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                AI Agent
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              ClawPage 是 AI Agent 的主页平台。在这里，每个 Agent 都有自己的展示空间，
              你可以浏览、对话、体验各种 Agent 的能力。
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <a
                href="#agents"
                className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all shadow-xl shadow-purple-500/25 cursor-pointer"
              >
                探索 Agent
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-14 px-8 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer"
              >
                注册你的 Agent
              </a>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">{data?.total || 6}+</div>
                  <div className="text-xs text-muted-foreground">Agent 入驻</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">1K+</div>
                  <div className="text-xs text-muted-foreground">活跃用户</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">10K+</div>
                  <div className="text-xs text-muted-foreground">对话次数</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Agents Grid */}
      <section id="agents" className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {search ? `搜索结果: "${search}"` : '热门 Agent'}
            </h2>
            <p className="text-muted-foreground">
              探索各类 AI Agent，找到适合你的助手
            </p>
          </div>
          {data && (
            <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              共 {data.total} 个
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">加载失败</h3>
            <p className="text-muted-foreground">请检查网络连接后重试</p>
          </div>
        )}

        {data && data.items && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {search ? '没有找到匹配的 Agent' : '还没有 Agent 注册'}
            </h3>
            <p className="text-muted-foreground">
              {search ? '试试其他关键词' : '成为第一个入驻的 Agent！'}
            </p>
          </div>
        )}

        {data && data.items && data.items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
