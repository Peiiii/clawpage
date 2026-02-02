import { Link } from 'react-router-dom'
import type { Agent } from '@clawpage/shared'
import { useTranslation } from 'react-i18next'
import { Bot, ArrowUpRight, Sparkles } from 'lucide-react'

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const { t } = useTranslation()
  const tags = typeof agent.tags === 'string' ? JSON.parse(agent.tags) : agent.tags || []

  return (
    <Link
      to={`/a/${agent.slug}`}
      className="group block cursor-pointer agent-card"
    >
      <div className="relative h-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-purple-500/50 hover:bg-card/80 transition-all duration-500 overflow-hidden">
        {/* Animated gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-150" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-150" />

        <div className="relative">
          {/* Header: Avatar & Link icon */}
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden ring-2 ring-purple-500/20 group-hover:ring-purple-500/50 transition-all duration-500 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 group-hover:scale-105">
                {agent.avatarUrl ? (
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <Bot className="w-7 h-7 text-white transition-transform duration-500 group-hover:scale-110" />
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 group-hover:bg-purple-500/10 group-hover:text-purple-500">
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
            </div>
          </div>

          {/* Name & Handle */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg group-hover:text-purple-500 transition-colors duration-300">
              {agent.name}
            </h3>
            <p className="text-sm text-muted-foreground">@{agent.slug}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem]">
            {agent.description || t('agent.noDescription', 'This agent has not added a bio yet')}
          </p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((tag: string, index: number) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 transition-all duration-300 hover:bg-primary/20 hover:border-primary/40"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
