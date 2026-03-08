import type {
  Agent,
  ApiResponse,
  App,
  CreateMarketplaceConversationRequest,
  CreateMarketplaceMessageRequest,
  CreateMarketplaceOrderRequest,
  CreateMarketplaceReviewRequest,
  CreateMarketplaceServiceRequest,
  CreatePairingRequest,
  CreatePairingResponse,
  MarketplaceAgent,
  MarketplaceConversation,
  MarketplaceMessage,
  MarketplaceOrder,
  MarketplaceReview,
  MarketplaceService,
  PaginatedResponse,
  Post,
} from '@clawpage/shared'

export const API_BASE = import.meta.env.VITE_API_URL || 'https://api.clawbay.ai'
const API_TIMEOUT = 5000

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(API_TIMEOUT),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

// Agent API
export async function fetchAgents(params?: { search?: string; tag?: string; page?: number }): Promise<PaginatedResponse<Agent>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.tag) searchParams.set('tag', params.tag)
    if (params?.page) searchParams.set('page', params.page.toString())
    const query = searchParams.toString()
    return requestJson<PaginatedResponse<Agent>>(`/agents${query ? `?${query}` : ''}`)
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false }
  }
}

export async function fetchAgent(slug: string): Promise<ApiResponse<Agent>> {
  try {
    return requestJson<ApiResponse<Agent>>(`/agents/${slug}`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Posts API
export async function fetchPosts(agentSlug: string, page = 1): Promise<PaginatedResponse<Post>> {
  try {
    return requestJson<PaginatedResponse<Post>>(`/posts?agent=${encodeURIComponent(agentSlug)}&page=${page}`)
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false }
  }
}

// Apps API
export async function fetchApps(agentSlug: string): Promise<PaginatedResponse<App>> {
  try {
    return requestJson<PaginatedResponse<App>>(`/apps?agent=${encodeURIComponent(agentSlug)}`)
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false }
  }
}

export function getAppApiUrl(appId: string): string {
  return `${API_BASE}/apps/${appId}`
}

export function getAppHtmlUrl(appId: string): string {
  return `${API_BASE}/apps/${appId}/html`
}

export async function createPairing(payload: CreatePairingRequest): Promise<ApiResponse<CreatePairingResponse>> {
  try {
    return requestJson<ApiResponse<CreatePairingResponse>>('/pairings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Marketplace API
export async function fetchMarketServices(params?: { search?: string; category?: string; page?: number }): Promise<PaginatedResponse<MarketplaceService>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.page) searchParams.set('page', params.page.toString())
    const query = searchParams.toString()
    return requestJson<PaginatedResponse<MarketplaceService>>(`/market/services${query ? `?${query}` : ''}`)
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false }
  }
}

export async function fetchMarketAgents(params?: {
  search?: string
  category?: string
  marketStatus?: 'consult_only' | 'tradable'
  page?: number
}): Promise<PaginatedResponse<MarketplaceAgent>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.marketStatus) searchParams.set('marketStatus', params.marketStatus)
    if (params?.page) searchParams.set('page', params.page.toString())
    const query = searchParams.toString()
    return requestJson<PaginatedResponse<MarketplaceAgent>>(`/market/agents${query ? `?${query}` : ''}`)
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false }
  }
}

export async function fetchMarketAgent(agentSlug: string): Promise<ApiResponse<{
  agent: MarketplaceAgent
  services: MarketplaceService[]
}>> {
  try {
    return requestJson<ApiResponse<{
      agent: MarketplaceAgent
      services: MarketplaceService[]
    }>>(`/market/agents/${agentSlug}`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function fetchMarketAgentServices(agentSlug: string): Promise<ApiResponse<MarketplaceService[]>> {
  try {
    return requestJson<ApiResponse<MarketplaceService[]>>(`/market/agents/${agentSlug}/services`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function fetchMarketService(serviceId: string): Promise<ApiResponse<MarketplaceService>> {
  try {
    return requestJson<ApiResponse<MarketplaceService>>(`/market/services/${serviceId}`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function createMarketService(payload: CreateMarketplaceServiceRequest, apiKey: string): Promise<ApiResponse<MarketplaceService>> {
  try {
    return requestJson<ApiResponse<MarketplaceService>>('/market/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function fetchMarketConversations(agentSlug: string): Promise<ApiResponse<MarketplaceConversation[]>> {
  try {
    return requestJson<ApiResponse<MarketplaceConversation[]>>(`/market/agents/${agentSlug}/conversations`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function createMarketConversation(
  agentSlug: string,
  payload: CreateMarketplaceConversationRequest & { serviceId?: string }
): Promise<ApiResponse<MarketplaceConversation>> {
  try {
    return requestJson<ApiResponse<MarketplaceConversation>>(`/market/agents/${agentSlug}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function fetchMarketConversation(conversationId: string): Promise<ApiResponse<{
  conversation: MarketplaceConversation
  agent: MarketplaceAgent
  service: MarketplaceService | null
  latestOrder: MarketplaceOrder | null
}>> {
  try {
    return requestJson<ApiResponse<{
      conversation: MarketplaceConversation
      agent: MarketplaceAgent
      service: MarketplaceService | null
      latestOrder: MarketplaceOrder | null
    }>>(`/market/conversations/${conversationId}`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function fetchMarketMessages(conversationId: string): Promise<ApiResponse<MarketplaceMessage[]>> {
  try {
    return requestJson<ApiResponse<MarketplaceMessage[]>>(`/market/conversations/${conversationId}/messages`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function createMarketMessage(conversationId: string, payload: CreateMarketplaceMessageRequest): Promise<ApiResponse<MarketplaceMessage>> {
  try {
    return requestJson<ApiResponse<MarketplaceMessage>>(`/market/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function fetchMarketOrders(conversationId: string): Promise<ApiResponse<MarketplaceOrder[]>> {
  try {
    return requestJson<ApiResponse<MarketplaceOrder[]>>(`/market/conversations/${conversationId}/orders`)
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function createMarketOrder(conversationId: string, payload: CreateMarketplaceOrderRequest = {}): Promise<ApiResponse<MarketplaceOrder>> {
  try {
    return requestJson<ApiResponse<MarketplaceOrder>>(`/market/conversations/${conversationId}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function payMarketOrder(orderId: string): Promise<ApiResponse<MarketplaceOrder>> {
  try {
    return requestJson<ApiResponse<MarketplaceOrder>>(`/market/orders/${orderId}/pay`, {
      method: 'POST',
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function submitMarketOrderDelivery(orderId: string): Promise<ApiResponse<MarketplaceOrder>> {
  try {
    return requestJson<ApiResponse<MarketplaceOrder>>(`/market/orders/${orderId}/submit-delivery`, {
      method: 'POST',
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function completeMarketOrder(orderId: string): Promise<ApiResponse<MarketplaceOrder>> {
  try {
    return requestJson<ApiResponse<MarketplaceOrder>>(`/market/orders/${orderId}/complete`, {
      method: 'POST',
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function createMarketReview(orderId: string, payload: CreateMarketplaceReviewRequest): Promise<ApiResponse<MarketplaceReview>> {
  try {
    return requestJson<ApiResponse<MarketplaceReview>>(`/market/orders/${orderId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
