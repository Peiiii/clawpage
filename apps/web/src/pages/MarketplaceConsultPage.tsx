import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import type { MarketplaceOrder, MarketplaceService } from '@clawpage/shared'
import {
  completeMarketOrder,
  createMarketConversation,
  createMarketMessage,
  createMarketOrder,
  createMarketReview,
  fetchMarketAgent,
  fetchMarketConversation,
  fetchMarketConversations,
  fetchMarketMessages,
  fetchMarketOrders,
  payMarketOrder,
  submitMarketOrderDelivery,
} from '@/lib/api'

function money(cents: number) {
  return `¥${(cents / 100).toLocaleString('zh-CN')}`
}

export function MarketplaceConsultPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { agentSlug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'seller' | 'order' | 'cases' | 'services'>('seller')
  const [messageInput, setMessageInput] = useState('')
  const [customerNameInput, setCustomerNameInput] = useState('需求方')
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)

  const conversationId = searchParams.get('conversationId') || ''
  const selectedServiceId = searchParams.get('serviceId') || ''

  const agentQuery = useQuery({
    queryKey: ['market-agent', agentSlug],
    queryFn: () => fetchMarketAgent(agentSlug),
    enabled: Boolean(agentSlug),
  })

  const conversationsQuery = useQuery({
    queryKey: ['market-conversations', agentSlug],
    queryFn: () => fetchMarketConversations(agentSlug),
    enabled: Boolean(agentSlug),
    refetchInterval: 3000,
  })

  const detailQuery = useQuery({
    queryKey: ['market-conversation', conversationId],
    queryFn: () => fetchMarketConversation(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 3000,
  })

  const messagesQuery = useQuery({
    queryKey: ['market-messages', conversationId],
    queryFn: () => fetchMarketMessages(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 3000,
  })

  const ordersQuery = useQuery({
    queryKey: ['market-orders', conversationId],
    queryFn: () => fetchMarketOrders(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 3000,
  })

  const conversations = useMemo(
    () => conversationsQuery.data?.data || [],
    [conversationsQuery.data?.data]
  )
  const messages = useMemo(
    () => messagesQuery.data?.data || [],
    [messagesQuery.data?.data]
  )
  const orders = useMemo(
    () => ordersQuery.data?.data || [],
    [ordersQuery.data?.data]
  )

  const services = useMemo(
    () => agentQuery.data?.data?.services || [],
    [agentQuery.data?.data?.services]
  )
  const fallbackService = useMemo(
    () => services.find((item) => item.id === selectedServiceId) || services[0] || null,
    [services, selectedServiceId]
  )

  const currentAgent = detailQuery.data?.data?.agent || agentQuery.data?.data?.agent
  const currentService = detailQuery.data?.data?.service || fallbackService
  const currentConversation = detailQuery.data?.data?.conversation || null
  const activeOrder = useMemo(() => orders[0], [orders])
  const isTradable = currentAgent?.marketStatus === 'tradable' || services.length > 0

  useEffect(() => {
    if (!conversationId && conversations.length > 0) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('conversationId', conversations[0].id)
        return next
      })
    }
  }, [conversationId, conversations, setSearchParams])

  const reloadConversationRelated = async () => {
    if (!conversationId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['market-messages', conversationId] }),
      queryClient.invalidateQueries({ queryKey: ['market-orders', conversationId] }),
      queryClient.invalidateQueries({ queryKey: ['market-conversation', conversationId] }),
      queryClient.invalidateQueries({ queryKey: ['market-conversations', agentSlug] }),
    ])
  }

  const createConversation = async (serviceIdOverride?: string) => {
    if (!agentSlug) return
    const effectiveServiceId = serviceIdOverride || selectedServiceId || undefined
    const response = await createMarketConversation(agentSlug, {
      customerName: customerNameInput.trim() || '需求方',
      serviceId: effectiveServiceId,
      initialMessage: '你好，我想咨询一下合作方式。',
    })

    if (!response.success || !response.data) {
      alert(response.error || '创建会话失败')
      return
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('conversationId', response.data!.id)
      if (response.data?.serviceId) next.set('serviceId', response.data.serviceId)
      else if (effectiveServiceId) next.set('serviceId', effectiveServiceId)
      return next
    })

    await queryClient.invalidateQueries({ queryKey: ['market-conversations', agentSlug] })
  }

  const sendMessage = async () => {
    if (!conversationId || !messageInput.trim()) return
    const content = messageInput.trim()
    setMessageInput('')

    const response = await createMarketMessage(conversationId, {
      senderRole: 'customer',
      content,
      messageType: 'text',
    })

    if (!response.success) {
      alert(response.error || '发送失败')
      return
    }

    await reloadConversationRelated()
  }

  const createOrder = async () => {
    if (!conversationId) return
    if (!currentConversation?.serviceId) {
      alert('当前会话未绑定服务，先在右侧选择服务后新建会话。')
      return
    }

    const response = await createMarketOrder(conversationId)
    if (!response.success) {
      alert(response.error || '创建订单失败')
      return
    }
    await reloadConversationRelated()
  }

  const transitionOrder = async (
    order: MarketplaceOrder,
    action: 'pay' | 'submit' | 'complete'
  ) => {
    const call =
      action === 'pay'
        ? payMarketOrder(order.id)
        : action === 'submit'
          ? submitMarketOrderDelivery(order.id)
          : completeMarketOrder(order.id)

    const response = await call
    if (!response.success) {
      alert(response.error || '状态流转失败')
      return
    }

    await reloadConversationRelated()
  }

  const submitReview = async () => {
    if (!activeOrder || activeOrder.status !== 'completed') return
    const response = await createMarketReview(activeOrder.id, {
      rating,
      comment: reviewText.trim(),
    })

    if (!response.success) {
      alert(response.error || '评价失败')
      return
    }

    setReviewText('')
    alert('评价已提交')
  }

  const gotoServiceList = () => navigate('/')

  const bindServiceAndCreateConversation = async (service: MarketplaceService) => {
    await createConversation(service.id)
  }

  return (
    <div className="h-full bg-[#f7f7fa]">
      <Helmet>
        <title>咨询工作台 - ClawBay</title>
      </Helmet>

      <div className="h-full container mx-auto px-3 py-3">
        <div className="h-full grid grid-cols-12 gap-3">
          <aside className="col-span-3 rounded-2xl border border-border bg-white overflow-hidden">
            <div className="p-3 bg-orange-500 text-white">
              <p className="text-xs opacity-90">当前 Agent</p>
              <p className="font-semibold mt-1 line-clamp-1">{currentAgent?.name || 'Agent 咨询'}</p>
            </div>

            <div className="p-3 border-b border-border/60 space-y-2">
              <input
                value={customerNameInput}
                onChange={(event) => setCustomerNameInput(event.target.value)}
                placeholder="你的称呼"
                className="w-full h-9 rounded-lg border border-border px-3 text-sm"
              />
              <button
                onClick={() => {
                  void createConversation()
                }}
                className="w-full h-9 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
              >
                新建咨询会话
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-138px)]">
              {conversations.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('conversationId', item.id)
                      if (item.serviceId) next.set('serviceId', item.serviceId)
                      return next
                    })
                  }}
                  className={[
                    'w-full text-left px-3 py-3 border-b border-border/50 transition-colors',
                    item.id === conversationId ? 'bg-orange-50' : 'bg-white hover:bg-muted/40',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium line-clamp-1">{item.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.lastMessageAt).toLocaleString()}</p>
                  <p className="text-[11px] mt-1 text-muted-foreground">{item.serviceId ? '可下单会话' : '仅咨询会话'}</p>
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">还没有会话，先创建一个咨询会话。</div>
              )}
            </div>
          </aside>

          <main className="col-span-6 rounded-2xl border border-border bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">咨询对象</p>
                <p className="font-semibold">{currentAgent?.name || 'Agent 商家'}</p>
              </div>
              <button onClick={gotoServiceList} className="text-sm text-orange-600 hover:underline">
                返回市场
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafbff]">
              {messages.map((message) => {
                const isCustomer = message.senderRole === 'customer'
                const isCard = message.messageType === 'service_card'

                if (isCard) {
                  let cardTitle = currentService?.title || '服务卡片'
                  let cardPrice = currentService?.priceCents || 0
                  let cardDays = currentService?.deliveryDays || 0
                  try {
                    const parsed = JSON.parse(message.content) as {
                      title?: string
                      priceCents?: number
                      deliveryDays?: number
                    }
                    cardTitle = parsed.title || cardTitle
                    cardPrice = parsed.priceCents || cardPrice
                    cardDays = parsed.deliveryDays || cardDays
                  } catch {
                    // no-op
                  }

                  return (
                    <div key={message.id} className="max-w-[75%] rounded-xl border border-orange-200 bg-white overflow-hidden">
                      <div className="px-3 py-2 bg-orange-500 text-white text-sm font-medium">服务卡片</div>
                      <div className="p-3">
                        <p className="font-semibold">{cardTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">交付周期 {cardDays} 天</p>
                        <p className="mt-2 text-orange-500 text-lg font-bold">{money(cardPrice)}</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={message.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                    <div className={[
                      'max-w-[75%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                      isCustomer ? 'bg-orange-500 text-white' : 'bg-white border border-border',
                    ].join(' ')}>
                      {message.content}
                    </div>
                  </div>
                )
              })}

              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">请选择或创建会话后开始咨询。</div>
              )}
            </div>

            <div className="p-3 border-t border-border/60 flex gap-2">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder="输入消息..."
                className="flex-1 h-10 rounded-lg border border-border px-3 text-sm"
              />
              <button
                onClick={sendMessage}
                className="h-10 px-5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium"
              >
                发送
              </button>
            </div>
          </main>

          <aside className="col-span-3 rounded-2xl border border-border bg-white overflow-hidden flex flex-col">
            <div className="px-3 pt-3 border-b border-border/60">
              <div className="flex gap-3 text-sm">
                <button onClick={() => setActiveTab('seller')} className={activeTab === 'seller' ? 'text-orange-600 font-semibold pb-2 border-b-2 border-orange-500' : 'text-muted-foreground pb-2'}>商家信息</button>
                <button onClick={() => setActiveTab('order')} className={activeTab === 'order' ? 'text-orange-600 font-semibold pb-2 border-b-2 border-orange-500' : 'text-muted-foreground pb-2'}>订单信息</button>
                <button onClick={() => setActiveTab('cases')} className={activeTab === 'cases' ? 'text-orange-600 font-semibold pb-2 border-b-2 border-orange-500' : 'text-muted-foreground pb-2'}>商家案例</button>
                <button onClick={() => setActiveTab('services')} className={activeTab === 'services' ? 'text-orange-600 font-semibold pb-2 border-b-2 border-orange-500' : 'text-muted-foreground pb-2'}>商家服务</button>
              </div>
            </div>

            <div className="p-3 overflow-y-auto flex-1">
              {activeTab === 'seller' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                    平台担保交易：订单完成后再结算，保障买卖双方。
                  </div>

                  <div>
                    <p className="text-base font-semibold">{currentAgent?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground mt-1">@{currentAgent?.slug || '-'}</p>
                    <p className="text-xs mt-1 text-muted-foreground">{isTradable ? '当前状态：可下单' : '当前状态：仅咨询'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-semibold">{currentAgent?.avgRating?.toFixed(1) || '0.0'}</p>
                      <p className="text-[11px] text-muted-foreground">服务评分</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-semibold">{currentAgent?.completedOrders || 0}</p>
                      <p className="text-[11px] text-muted-foreground">已完成</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="h-10 rounded-lg border border-orange-300 text-orange-600 text-sm">微信咨询</button>
                    <button className="h-10 rounded-lg border border-orange-300 text-orange-600 text-sm">电话咨询</button>
                    <button onClick={() => setActiveTab('services')} className="h-10 rounded-lg bg-orange-500 text-white text-sm">选择服务</button>
                    <button onClick={gotoServiceList} className="h-10 rounded-lg bg-orange-500 text-white text-sm">进入市场</button>
                  </div>
                </div>
              )}

              {activeTab === 'order' && (
                <div className="space-y-3">
                  {!conversationId && (
                    <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                      先在左侧创建或选择一个咨询会话。
                    </div>
                  )}

                  {conversationId && !activeOrder && (
                    <>
                      {!currentConversation?.serviceId ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                          该会话是仅咨询模式，未绑定服务，暂不可下单。
                        </div>
                      ) : (
                        <button onClick={createOrder} className="w-full h-10 rounded-lg bg-orange-500 text-white text-sm font-medium">
                          创建订单
                        </button>
                      )}
                    </>
                  )}

                  {activeOrder && (
                    <>
                      <div className="rounded-xl border border-border p-3 text-sm space-y-1">
                        <p>订单号：{activeOrder.id.slice(0, 8)}</p>
                        <p>金额：{money(activeOrder.amountCents)}</p>
                        <p>平台抽佣：{Math.round(activeOrder.platformFeeRate * 100)}%</p>
                        <p>状态：{activeOrder.status}</p>
                      </div>

                      {activeOrder.status === 'pending_payment' && (
                        <button onClick={() => transitionOrder(activeOrder, 'pay')} className="w-full h-10 rounded-lg bg-orange-500 text-white text-sm">
                          模拟支付（进入进行中）
                        </button>
                      )}

                      {activeOrder.status === 'in_progress' && (
                        <button onClick={() => transitionOrder(activeOrder, 'submit')} className="w-full h-10 rounded-lg bg-orange-500 text-white text-sm">
                          提交验收
                        </button>
                      )}

                      {activeOrder.status === 'pending_acceptance' && (
                        <button onClick={() => transitionOrder(activeOrder, 'complete')} className="w-full h-10 rounded-lg bg-orange-500 text-white text-sm">
                          确认完成
                        </button>
                      )}

                      {activeOrder.status === 'completed' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                onClick={() => setRating(value)}
                                className={[
                                  'h-8 w-8 rounded-md text-sm border',
                                  rating >= value ? 'bg-orange-500 text-white border-orange-500' : 'border-border',
                                ].join(' ')}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={reviewText}
                            onChange={(event) => setReviewText(event.target.value)}
                            placeholder="写下本次服务评价"
                            className="w-full min-h-20 rounded-lg border border-border p-2 text-sm"
                          />
                          <button onClick={submitReview} className="w-full h-9 rounded-lg bg-orange-500 text-white text-sm">
                            提交评价
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'cases' && (
                <div className="text-sm text-muted-foreground">MVP 阶段先留空，后续接入商家案例库。</div>
              )}

              {activeTab === 'services' && (
                <div className="space-y-2">
                  <p className="font-medium text-sm">选择服务并发起会话</p>
                  {services.length === 0 && (
                    <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                      该 Agent 暂无可交易服务，目前仅支持咨询。
                    </div>
                  )}
                  {services.map((service) => (
                    <div key={service.id} className={[
                      'rounded-xl border p-3',
                      service.id === selectedServiceId ? 'border-orange-400 bg-orange-50/60' : 'border-border',
                    ].join(' ')}>
                      <p className="font-medium">{service.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{service.summary || '暂无摘要'}</p>
                      <p className="text-orange-500 text-lg font-semibold mt-2">{money(service.priceCents)}</p>
                      <button
                        onClick={() => {
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev)
                            next.set('serviceId', service.id)
                            return next
                          })
                        }}
                        className="mt-2 h-8 px-3 rounded-md border border-orange-300 text-orange-700 text-xs"
                      >
                        设为默认服务
                      </button>
                      <button
                        onClick={() => {
                          void bindServiceAndCreateConversation(service)
                        }}
                        className="mt-2 ml-2 h-8 px-3 rounded-md bg-orange-500 text-white text-xs"
                      >
                        绑定并发起咨询
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
