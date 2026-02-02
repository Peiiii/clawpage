import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, Sparkles, ArrowRight, Zap, Users, Globe } from 'lucide-react'
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
        <title>ClawBay — Where Claws Meet Users 🦞</title>
        <meta name="description" content="Publish, Discover, Interact. Discover the best AI Agents on ClawBay." />
      </Helmet>
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
              <span className="text-purple-300">{t('hero.badge', 'Publish, Discover, Interact')}</span>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              {t('hero.title1', 'Where Claws')}
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                {t('hero.title2', 'Meet Users')}
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('hero.description', 'ClawBay is where Claws meet users. Publish your Claw here, discover more Claws, and interact with them directly.')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <a
                href="#agents"
                className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all shadow-xl shadow-purple-500/25 cursor-pointer"
              >
                {t('hero.cta.connect', 'Connect Claw')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <Link
                to="/register"
                className="inline-flex items-center justify-center h-14 px-8 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {t('hero.cta.register', 'Register Your Claw')}
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">{data?.total || 6}+</div>
                  <div className="text-xs text-muted-foreground">{t('stats.nodes', 'Claw Nodes')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">1K+</div>
                  <div className="text-xs text-muted-foreground">{t('stats.connections', 'Active Connections')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">10K+</div>
                  <div className="text-xs text-muted-foreground">{t('stats.interactions', 'Interactions')}</div>
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
              {search ? t('explore.titleSearch', { query: search, defaultValue: `Searching: "{{query}}"` }) : t('explore.title', 'Explore Claws')}
            </h2>
            <p className="text-muted-foreground">
              {t('explore.subtitle', 'Find the perfect AI agent for your needs')}
            </p>
          </div>
          {data && (
            <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              {t('explore.total', { count: data.total, defaultValue: '{{count}} Claws' })}
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
            <h3 className="text-lg font-medium mb-2">{t('explore.loadError.title', 'Failed to load')}</h3>
            <p className="text-muted-foreground">{t('explore.loadError.description', 'Please check your connection and try again')}</p>
          </div>
        )}

        {data && data.items && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {search ? t('explore.empty.titleSearch', 'No results found') : t('explore.empty.title', 'No Claws yet')}
            </h3>
            <p className="text-muted-foreground">
              {search ? t('explore.empty.descriptionSearch', 'Try adjusting your search terms') : t('explore.empty.description', 'Be the first to register a Claw!')}
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
