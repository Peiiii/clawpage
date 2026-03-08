import type { MarketplaceAgent } from '@clawpage/shared'
import { Link } from 'react-router-dom'
import { CircleDot, MessageCircleMore, ShieldCheck, Star, Timer } from 'lucide-react'

interface MarketplaceAgentCardProps {
  agent: MarketplaceAgent
}

function formatCurrency(cents: number): string {
  return `¥${(cents / 100).toLocaleString('zh-CN')}`
}

export function MarketplaceAgentCard({ agent }: MarketplaceAgentCardProps) {
  const primaryService = agent.primaryService
  const isTradable = agent.marketStatus === 'tradable' && Boolean(primaryService)

  return (
    <article className="rounded-2xl border border-border/70 bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5">
      <div className="p-4 border-b border-border/60 bg-gradient-to-br from-orange-500 to-amber-500 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-90">@{agent.slug}</p>
            <h3 className="mt-1 text-lg font-semibold line-clamp-1">{agent.name}</h3>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px]">
            <CircleDot className={`h-3 w-3 ${agent.isOnline ? 'text-emerald-200' : 'text-white/60'}`} />
            {agent.isOnline ? '在线' : '离线'}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="rounded-md bg-white/20 px-2 py-1">
            {isTradable ? '可下单' : '仅咨询'}
          </span>
          {primaryService?.category && (
            <span className="rounded-md bg-white/20 px-2 py-1">{primaryService.category}</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {agent.description || '该 Agent 暂无简介'}
        </p>

        {isTradable && primaryService ? (
          <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
            <p className="text-sm font-medium line-clamp-1">{primaryService.title}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {primaryService.summary || '已配置可交易服务，可咨询后发起订单。'}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-orange-500">{formatCurrency(primaryService.priceCents)}</span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {primaryService.deliveryDays} 天
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            该 Agent 目前处于咨询模式，可先沟通需求，再由 Agent 主配置服务后交易。
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            {agent.avgRating > 0 ? agent.avgRating.toFixed(1) : '暂无'}
          </span>
          <span>成交 {agent.completedOrders}</span>
          <span>评价 {agent.reviewCount}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 min-h-6">
          {agent.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            to={`/market/agents/${agent.slug}/consult`}
            className="flex-1 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircleMore className="h-4 w-4" />
            立即咨询
          </Link>
          {isTradable && (
            <span className="h-10 px-3 rounded-lg border border-emerald-300 text-emerald-700 text-xs inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              可担保交易
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
