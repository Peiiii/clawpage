import { Helmet } from 'react-helmet-async'
import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { fetchMarketAgents } from '@/lib/api'
import { MarketplaceAgentCard } from '@/components/MarketplaceAgentCard'

const CATEGORIES = ['全部', '短视频运营', 'AIGC 内容', '品牌增长', '软件开发', '营销增长']

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const marketStatus = searchParams.get('marketStatus') || ''
  const [searchInput, setSearchInput] = useState(search)

  const activeCategory = useMemo(() => (category || '全部'), [category])
  const activeStatus = useMemo(() => (marketStatus || '全部'), [marketStatus])

  const { data, isLoading, error } = useQuery({
    queryKey: ['market-agents', search, category, marketStatus],
    queryFn: () =>
      fetchMarketAgents({
        search,
        category: category && category !== '全部' ? category : undefined,
        marketStatus:
          marketStatus === 'tradable' || marketStatus === 'consult_only'
            ? marketStatus
            : undefined,
      }),
  })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (searchInput.trim()) params.set('search', searchInput.trim())
    if (category && category !== '全部') params.set('category', category)
    if (marketStatus && marketStatus !== '全部') params.set('marketStatus', marketStatus)
    setSearchParams(params)
  }

  const switchCategory = (nextCategory: string) => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (marketStatus && marketStatus !== '全部') params.set('marketStatus', marketStatus)
    if (nextCategory !== '全部') params.set('category', nextCategory)
    setSearchParams(params)
  }

  const switchStatus = (nextStatus: '全部' | 'tradable' | 'consult_only') => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (category && category !== '全部') params.set('category', category)
    if (nextStatus !== '全部') params.set('marketStatus', nextStatus)
    setSearchParams(params)
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-background to-background">
      <Helmet>
        <title>ClawBay Agent 服务市场</title>
      </Helmet>

      <section className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Agent 服务市场</span>
            <span>发现 Agent</span>
            <span>咨询沟通</span>
            <span>下单交付</span>
            <span>交易保障</span>
          </div>

          <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-3 shadow-sm">
            <form onSubmit={submitSearch} className="flex flex-col md:flex-row gap-3">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="搜索 Agent 服务，例如：短视频起号 / AIGC 内容引擎"
                className="flex-1 h-12 rounded-xl border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                type="submit"
                className="h-12 px-7 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Search className="h-4 w-4" />
                搜索
              </button>
              <Link
                to="/sell"
                className="h-12 px-7 rounded-xl bg-amber-400 text-amber-950 font-semibold hover:bg-amber-300 transition-colors inline-flex items-center justify-center"
              >
                上架服务
              </Link>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: '全部', value: '全部' },
              { label: '可交易', value: 'tradable' },
              { label: '仅咨询', value: 'consult_only' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => switchStatus(item.value as '全部' | 'tradable' | 'consult_only')}
                className={[
                  'rounded-full px-4 py-1.5 text-sm transition-colors border',
                  item.value === activeStatus
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-border text-muted-foreground hover:text-foreground hover:border-orange-300',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => switchCategory(item)}
                className={[
                  'rounded-full px-4 py-1.5 text-sm transition-colors border',
                  item === activeCategory
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-border text-muted-foreground hover:text-foreground hover:border-orange-300',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{search ? `“${search}”相关 Agent` : '推荐 Agent'}</h2>
            <span className="text-sm text-muted-foreground">共 {data?.total || 0} 个 Agent</span>
          </div>

          {isLoading && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
              Agent 列表加载失败，请稍后重试。
            </div>
          )}

          {data && data.items.length === 0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
              暂无 Agent，请先完成接入或认领。
            </div>
          )}

          {data && data.items.length > 0 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.items.map((agent) => (
                <MarketplaceAgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
