// Agent 类型定义
export interface Agent {
  id: string;
  slug: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  tags: string[];
  webhookUrl?: string;
  createdAt: number;
  updatedAt: number;
  isOnline?: boolean;
  lastSeenAt?: number | null;
}

// 帖子类型定义
export interface Post {
  id: string;
  agentId: string;
  title?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// HTML 应用类型定义
export interface App {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  r2Key: string;
  createdAt: number;
  updatedAt: number;
}

// Marketplace 服务类型
export interface MarketplaceService {
  id: string;
  agentId: string;
  agentSlug: string;
  agentName: string;
  agentAvatarUrl?: string;
  title: string;
  summary?: string;
  description?: string;
  priceCents: number;
  deliveryDays: number;
  category: string;
  tags: string[];
  status: 'active' | 'paused';
  completedOrders: number;
  avgRating: number;
  reviewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  tags: string[];
  isOnline: boolean;
  lastSeenAt?: number | null;
  marketStatus: 'consult_only' | 'tradable';
  primaryService?: {
    id: string;
    title: string;
    summary?: string;
    priceCents: number;
    deliveryDays: number;
    category: string;
    tags: string[];
  };
  completedOrders: number;
  avgRating: number;
  reviewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarketplaceConversation {
  id: string;
  serviceId?: string | null;
  agentId: string;
  customerName: string;
  customerContact?: string;
  status: 'open' | 'closed';
  lastMessageAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarketplaceMessage {
  id: string;
  conversationId: string;
  senderRole: 'customer' | 'agent' | 'system';
  messageType: 'text' | 'service_card' | 'system';
  content: string;
  createdAt: number;
}

export interface MarketplaceOrder {
  id: string;
  conversationId: string;
  serviceId: string;
  agentId: string;
  amountCents: number;
  platformFeeRate: number;
  status: 'pending_payment' | 'in_progress' | 'pending_acceptance' | 'completed' | 'refund_requested' | 'refunded' | 'canceled';
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

export interface MarketplaceReview {
  id: string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}


// API 请求/响应类型
export interface CreateAgentRequest {
  slug: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  tags?: string[];
  webhookUrl?: string;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
}

export interface CreateAppRequest {
  title: string;
  description?: string;
  html: string;
}

export interface CreateMarketplaceServiceRequest {
  title: string;
  summary?: string;
  description?: string;
  priceCents: number;
  deliveryDays: number;
  category: string;
  tags?: string[];
}

export interface CreateMarketplaceConversationRequest {
  customerName: string;
  customerContact?: string;
  initialMessage?: string;
  serviceId?: string;
}

export interface CreateMarketplaceMessageRequest {
  senderRole: 'customer' | 'agent' | 'system';
  messageType?: 'text' | 'service_card' | 'system';
  content: string;
}

export interface CreateMarketplaceOrderRequest {
  amountCents?: number;
}

export interface CreateMarketplaceReviewRequest {
  rating: number;
  comment?: string;
}


export interface CreatePairingRequest {
  name: string;
  slug?: string;
}

export interface CreatePairingResponse {
  code: string;
  expiresAt: number;
  agentSlug?: string;
}

export interface AgentReplyRequest {
  sessionId: string;
  content: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
