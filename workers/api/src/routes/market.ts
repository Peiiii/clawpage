import { Hono } from 'hono';
import type {
  ApiResponse,
  CreateMarketplaceConversationRequest,
  CreateMarketplaceMessageRequest,
  CreateMarketplaceOrderRequest,
  CreateMarketplaceReviewRequest,
  CreateMarketplaceServiceRequest,
  MarketplaceAgent,
  MarketplaceConversation,
  MarketplaceMessage,
  MarketplaceOrder,
  MarketplaceService,
  PaginatedResponse,
} from '@clawpage/shared';
import type { Env } from '../env';
import { agentAuthMiddleware } from '../middleware/auth';

export const marketRouter = new Hono<{ Bindings: Env }>();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PLATFORM_FEE_RATE = 0.1;
const PRESENCE_ONLINE_WINDOW_MS = 120_000;

async function parseOptionalJson<T>(request: Request): Promise<T | null> {
  const text = await request.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

interface DbServiceRow {
  id: string;
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  agent_avatar_url: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  price_cents: number;
  delivery_days: number;
  category: string;
  tags: string;
  status: 'active' | 'paused';
  completed_orders: number | null;
  avg_rating: number | null;
  review_count: number | null;
  created_at: number;
  updated_at: number;
}

interface DbAgentMarketRow {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  tags: string | null;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
  primary_service_id: string | null;
  primary_service_title: string | null;
  primary_service_summary: string | null;
  primary_service_price_cents: number | null;
  primary_service_delivery_days: number | null;
  primary_service_category: string | null;
  primary_service_tags: string | null;
  completed_orders: number | null;
  avg_rating: number | null;
  review_count: number | null;
}

interface DbConversationRow {
  id: string;
  service_id: string | null;
  agent_id: string;
  customer_name: string;
  customer_contact: string | null;
  status: 'open' | 'closed';
  last_message_at: number;
  created_at: number;
  updated_at: number;
}

interface DbMessageRow {
  id: string;
  conversation_id: string;
  sender_role: 'customer' | 'agent' | 'system';
  message_type: 'text' | 'service_card' | 'system';
  content: string;
  created_at: number;
}

interface DbOrderRow {
  id: string;
  conversation_id: string;
  service_id: string;
  agent_id: string;
  amount_cents: number;
  platform_fee_rate: number;
  status: 'pending_payment' | 'in_progress' | 'pending_acceptance' | 'completed' | 'refund_requested' | 'refunded' | 'canceled';
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

function safeParseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalizePage(input: string | undefined): number {
  const page = Number.parseInt(input || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizePageSize(input: string | undefined): number {
  const size = Number.parseInt(input || String(DEFAULT_PAGE_SIZE), 10);
  if (!Number.isFinite(size) || size <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
}

function transformService(row: DbServiceRow): MarketplaceService {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentSlug: row.agent_slug,
    agentName: row.agent_name,
    agentAvatarUrl: row.agent_avatar_url || undefined,
    title: row.title,
    summary: row.summary || undefined,
    description: row.description || undefined,
    priceCents: row.price_cents,
    deliveryDays: row.delivery_days,
    category: row.category,
    tags: safeParseTags(row.tags),
    status: row.status,
    completedOrders: row.completed_orders || 0,
    avgRating: Number((row.avg_rating || 0).toFixed(1)),
    reviewCount: row.review_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformAgent(row: DbAgentMarketRow, now: number): MarketplaceAgent {
  const isOnline = row.last_seen_at !== null && now - row.last_seen_at <= PRESENCE_ONLINE_WINDOW_MS;
  const tags = safeParseTags(row.tags);
  const primaryServiceTags = safeParseTags(row.primary_service_tags);
  const isTradable = Boolean(row.primary_service_id);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    avatarUrl: row.avatar_url || undefined,
    description: row.description || undefined,
    tags,
    isOnline,
    lastSeenAt: row.last_seen_at,
    marketStatus: isTradable ? 'tradable' : 'consult_only',
    primaryService: isTradable
      ? {
          id: row.primary_service_id!,
          title: row.primary_service_title || '服务方案',
          summary: row.primary_service_summary || undefined,
          priceCents: row.primary_service_price_cents || 0,
          deliveryDays: row.primary_service_delivery_days || 0,
          category: row.primary_service_category || '通用',
          tags: primaryServiceTags,
        }
      : undefined,
    completedOrders: row.completed_orders || 0,
    avgRating: Number((row.avg_rating || 0).toFixed(1)),
    reviewCount: row.review_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformConversation(row: DbConversationRow): MarketplaceConversation {
  return {
    id: row.id,
    serviceId: row.service_id,
    agentId: row.agent_id,
    customerName: row.customer_name,
    customerContact: row.customer_contact || undefined,
    status: row.status,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformMessage(row: DbMessageRow): MarketplaceMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role,
    messageType: row.message_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

function transformOrder(row: DbOrderRow): MarketplaceOrder {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    serviceId: row.service_id,
    agentId: row.agent_id,
    amountCents: row.amount_cents,
    platformFeeRate: row.platform_fee_rate,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

const SERVICE_SELECT = `
  SELECT
    s.*,
    a.slug AS agent_slug,
    a.name AS agent_name,
    a.avatar_url AS agent_avatar_url,
    COALESCE(stats.completed_orders, 0) AS completed_orders,
    COALESCE(stats.avg_rating, 0) AS avg_rating,
    COALESCE(stats.review_count, 0) AS review_count
  FROM market_services s
  JOIN agents a ON a.id = s.agent_id
  LEFT JOIN (
    SELECT
      o.service_id AS service_id,
      SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
      AVG(r.rating) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM market_orders o
    LEFT JOIN market_reviews r ON r.order_id = o.id
    GROUP BY o.service_id
  ) stats ON stats.service_id = s.id
`;

const AGENT_MARKET_SELECT = `
  SELECT
    a.id,
    a.slug,
    a.name,
    a.avatar_url,
    a.description,
    a.tags,
    a.created_at,
    a.updated_at,
    c.last_seen_at,
    s.id AS primary_service_id,
    s.title AS primary_service_title,
    s.summary AS primary_service_summary,
    s.price_cents AS primary_service_price_cents,
    s.delivery_days AS primary_service_delivery_days,
    s.category AS primary_service_category,
    s.tags AS primary_service_tags,
    COALESCE(stats.completed_orders, 0) AS completed_orders,
    COALESCE(stats.avg_rating, 0) AS avg_rating,
    COALESCE(stats.review_count, 0) AS review_count
  FROM agents a
  LEFT JOIN (
    SELECT agent_id, MAX(last_seen_at) AS last_seen_at
    FROM clawbay_connectors
    GROUP BY agent_id
  ) c ON c.agent_id = a.id
  LEFT JOIN market_services s ON s.id = (
    SELECT ms.id
    FROM market_services ms
    WHERE ms.agent_id = a.id AND ms.status = 'active'
    ORDER BY ms.updated_at DESC
    LIMIT 1
  )
  LEFT JOIN (
    SELECT
      o.agent_id AS agent_id,
      SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
      AVG(r.rating) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM market_orders o
    LEFT JOIN market_reviews r ON r.order_id = o.id
    GROUP BY o.agent_id
  ) stats ON stats.agent_id = a.id
`;

// -------- Agents-first market endpoints --------
marketRouter.get('/agents', async (c) => {
  const page = normalizePage(c.req.query('page'));
  const pageSize = normalizePageSize(c.req.query('pageSize'));
  const search = (c.req.query('search') || '').trim();
  const category = (c.req.query('category') || '').trim();
  const marketStatus = (c.req.query('marketStatus') || '').trim();

  const params: Array<string | number> = [];
  const whereClauses = ['a.deleted_at IS NULL', 'a.claimed_at IS NOT NULL'];

  if (search) {
    whereClauses.push('(a.name LIKE ? OR a.description LIKE ? OR a.tags LIKE ? OR s.title LIKE ? OR s.summary LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category) {
    whereClauses.push('s.category = ?');
    params.push(category);
  }

  if (marketStatus === 'tradable') {
    whereClauses.push('s.id IS NOT NULL');
  }

  if (marketStatus === 'consult_only') {
    whereClauses.push('s.id IS NULL');
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const listSql = `${AGENT_MARKET_SELECT} ${whereSql} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  const listResult = await c.env.DB.prepare(listSql).bind(...params, pageSize, offset).all<DbAgentMarketRow>();

  const countSql = `
    SELECT COUNT(*) AS count
    FROM agents a
    LEFT JOIN market_services s ON s.id = (
      SELECT ms.id
      FROM market_services ms
      WHERE ms.agent_id = a.id AND ms.status = 'active'
      ORDER BY ms.updated_at DESC
      LIMIT 1
    )
    ${whereSql}
  `;

  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;
  const now = Date.now();

  const response: PaginatedResponse<MarketplaceAgent> = {
    items: (listResult.results || []).map((row) => transformAgent(row, now)),
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };

  return c.json(response);
});

marketRouter.get('/agents/:agentSlug', async (c) => {
  const agentSlug = c.req.param('agentSlug');
  const row = await c.env.DB.prepare(`${AGENT_MARKET_SELECT} WHERE a.slug = ? AND a.deleted_at IS NULL AND a.claimed_at IS NOT NULL`)
    .bind(agentSlug)
    .first<DbAgentMarketRow>();

  if (!row) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }

  const services = await c.env.DB.prepare(`${SERVICE_SELECT} WHERE s.agent_id = ? AND s.status = 'active' ORDER BY s.updated_at DESC`)
    .bind(row.id)
    .all<DbServiceRow>();

  return c.json<ApiResponse<{ agent: MarketplaceAgent; services: MarketplaceService[] }>>({
    success: true,
    data: {
      agent: transformAgent(row, Date.now()),
      services: (services.results || []).map(transformService),
    },
  });
});

marketRouter.get('/agents/:agentSlug/services', async (c) => {
  const agentSlug = c.req.param('agentSlug');
  const agent = await c.env.DB.prepare('SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL AND claimed_at IS NOT NULL')
    .bind(agentSlug)
    .first<{ id: string }>();

  if (!agent) {
    return c.json<ApiResponse<MarketplaceService[]>>({ success: false, error: 'Agent not found' }, 404);
  }

  const services = await c.env.DB.prepare(`${SERVICE_SELECT} WHERE s.agent_id = ? AND s.status = 'active' ORDER BY s.updated_at DESC`)
    .bind(agent.id)
    .all<DbServiceRow>();

  return c.json<ApiResponse<MarketplaceService[]>>({
    success: true,
    data: (services.results || []).map(transformService),
  });
});

marketRouter.get('/agents/:agentSlug/conversations', async (c) => {
  const agentSlug = c.req.param('agentSlug');
  const agent = await c.env.DB.prepare('SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL AND claimed_at IS NOT NULL')
    .bind(agentSlug)
    .first<{ id: string }>();

  if (!agent) {
    return c.json<ApiResponse<MarketplaceConversation[]>>({ success: false, error: 'Agent not found' }, 404);
  }

  const rows = await c.env.DB.prepare(
    `SELECT * FROM market_conversations WHERE agent_id = ? ORDER BY last_message_at DESC LIMIT 200`
  )
    .bind(agent.id)
    .all<DbConversationRow>();

  return c.json<ApiResponse<MarketplaceConversation[]>>({
    success: true,
    data: (rows.results || []).map(transformConversation),
  });
});

marketRouter.post('/agents/:agentSlug/conversations', async (c) => {
  const agentSlug = c.req.param('agentSlug');
  const body = await c.req.json<CreateMarketplaceConversationRequest>();

  if (!body.customerName || !body.customerName.trim()) {
    return c.json<ApiResponse<null>>({ success: false, error: 'customerName is required' }, 400);
  }

  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL AND claimed_at IS NOT NULL'
  )
    .bind(agentSlug)
    .first<{ id: string }>();

  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }

  let service: { id: string; title: string; price_cents: number; delivery_days: number } | null = null;

  if (body.serviceId) {
    service = await c.env.DB.prepare(
      `SELECT id, title, price_cents, delivery_days
       FROM market_services
       WHERE id = ? AND agent_id = ? AND status = 'active'`
    )
      .bind(body.serviceId, agent.id)
      .first<{ id: string; title: string; price_cents: number; delivery_days: number }>();
  } else {
    service = await c.env.DB.prepare(
      `SELECT id, title, price_cents, delivery_days
       FROM market_services
       WHERE agent_id = ? AND status = 'active'
       ORDER BY updated_at DESC LIMIT 1`
    )
      .bind(agent.id)
      .first<{ id: string; title: string; price_cents: number; delivery_days: number }>();
  }

  const now = Date.now();
  const conversationId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO market_conversations (
      id, service_id, agent_id, customer_name, customer_contact, status, last_message_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`
  )
    .bind(
      conversationId,
      service?.id || null,
      agent.id,
      body.customerName.trim(),
      body.customerContact?.trim() || null,
      now,
      now,
      now
    )
    .run();

  if (service) {
    const serviceCardMessage = JSON.stringify({
      serviceId: service.id,
      title: service.title,
      priceCents: service.price_cents,
      deliveryDays: service.delivery_days,
    });

    await c.env.DB.prepare(
      `INSERT INTO market_messages (id, conversation_id, sender_role, message_type, content, created_at)
       VALUES (?, ?, 'system', 'service_card', ?, ?)`
    )
      .bind(crypto.randomUUID(), conversationId, serviceCardMessage, now)
      .run();
  }

  if (body.initialMessage?.trim()) {
    await c.env.DB.prepare(
      `INSERT INTO market_messages (id, conversation_id, sender_role, message_type, content, created_at)
       VALUES (?, ?, 'customer', 'text', ?, ?)`
    )
      .bind(crypto.randomUUID(), conversationId, body.initialMessage.trim(), now + 1)
      .run();

    await c.env.DB.prepare('UPDATE market_conversations SET last_message_at = ?, updated_at = ? WHERE id = ?')
      .bind(now + 1, now + 1, conversationId)
      .run();
  }

  const created = await c.env.DB.prepare('SELECT * FROM market_conversations WHERE id = ?')
    .bind(conversationId)
    .first<DbConversationRow>();

  return c.json<ApiResponse<MarketplaceConversation>>({ success: true, data: transformConversation(created!) }, 201);
});

// -------- Services endpoints (supply-side and compatibility) --------
marketRouter.get('/services', async (c) => {
  const page = normalizePage(c.req.query('page'));
  const pageSize = normalizePageSize(c.req.query('pageSize'));
  const search = (c.req.query('search') || '').trim();
  const category = (c.req.query('category') || '').trim();

  const offset = (page - 1) * pageSize;
  const params: Array<string | number> = [];
  const whereClauses = ['s.status = ?'];
  params.push('active');

  if (search) {
    whereClauses.push('(s.title LIKE ? OR s.summary LIKE ? OR a.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category) {
    whereClauses.push('s.category = ?');
    params.push(category);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const listSql = `${SERVICE_SELECT} ${whereSql} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
  const listResult = await c.env.DB.prepare(listSql)
    .bind(...params, pageSize, offset)
    .all<DbServiceRow>();

  const countSql = `
    SELECT COUNT(*) AS count
    FROM market_services s
    JOIN agents a ON a.id = s.agent_id
    ${whereSql}
  `;
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const response: PaginatedResponse<MarketplaceService> = {
    items: (listResult.results || []).map(transformService),
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };

  return c.json(response);
});

marketRouter.get('/services/:serviceId', async (c) => {
  const serviceId = c.req.param('serviceId');
  const service = await c.env.DB.prepare(`${SERVICE_SELECT} WHERE s.id = ?`)
    .bind(serviceId)
    .first<DbServiceRow>();

  if (!service) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Service not found' }, 404);
  }

  return c.json<ApiResponse<MarketplaceService>>({ success: true, data: transformService(service) });
});

marketRouter.post('/services', agentAuthMiddleware, async (c) => {
  const body = await c.req.json<CreateMarketplaceServiceRequest>();
  const agentId = c.get('agentId');

  if (!body.title || !body.category) {
    return c.json<ApiResponse<null>>({ success: false, error: 'title and category are required' }, 400);
  }

  if (!Number.isInteger(body.priceCents) || body.priceCents <= 0) {
    return c.json<ApiResponse<null>>({ success: false, error: 'priceCents must be a positive integer' }, 400);
  }

  if (!Number.isInteger(body.deliveryDays) || body.deliveryDays <= 0) {
    return c.json<ApiResponse<null>>({ success: false, error: 'deliveryDays must be a positive integer' }, 400);
  }

  const now = Date.now();
  const serviceId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO market_services (
      id, agent_id, title, summary, description, price_cents, delivery_days, category, tags, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  )
    .bind(
      serviceId,
      agentId,
      body.title.trim(),
      body.summary?.trim() || null,
      body.description?.trim() || null,
      body.priceCents,
      body.deliveryDays,
      body.category.trim(),
      JSON.stringify(body.tags || []),
      now,
      now
    )
    .run();

  const created = await c.env.DB.prepare(`${SERVICE_SELECT} WHERE s.id = ?`)
    .bind(serviceId)
    .first<DbServiceRow>();

  return c.json<ApiResponse<MarketplaceService>>({ success: true, data: transformService(created!) }, 201);
});

marketRouter.get('/services/:serviceId/conversations', async (c) => {
  const serviceId = c.req.param('serviceId');
  const list = await c.env.DB.prepare(
    `SELECT * FROM market_conversations WHERE service_id = ? ORDER BY last_message_at DESC LIMIT 100`
  )
    .bind(serviceId)
    .all<DbConversationRow>();

  return c.json<ApiResponse<MarketplaceConversation[]>>({
    success: true,
    data: (list.results || []).map(transformConversation),
  });
});

marketRouter.post('/services/:serviceId/conversations', async (c) => {
  const serviceId = c.req.param('serviceId');
  const service = await c.env.DB.prepare(
    `SELECT s.id, s.agent_id, s.title, s.price_cents, s.delivery_days
     FROM market_services s
     WHERE s.id = ? AND s.status = 'active'`
  )
    .bind(serviceId)
    .first<{ id: string; agent_id: string; title: string; price_cents: number; delivery_days: number }>();

  if (!service) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Service not found' }, 404);
  }

  const body = await c.req.json<CreateMarketplaceConversationRequest>();
  if (!body.customerName || !body.customerName.trim()) {
    return c.json<ApiResponse<null>>({ success: false, error: 'customerName is required' }, 400);
  }

  const now = Date.now();
  const conversationId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO market_conversations (
      id, service_id, agent_id, customer_name, customer_contact, status, last_message_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`
  )
    .bind(
      conversationId,
      service.id,
      service.agent_id,
      body.customerName.trim(),
      body.customerContact?.trim() || null,
      now,
      now,
      now
    )
    .run();

  const serviceCardMessage = JSON.stringify({
    serviceId: service.id,
    title: service.title,
    priceCents: service.price_cents,
    deliveryDays: service.delivery_days,
  });

  await c.env.DB.prepare(
    `INSERT INTO market_messages (id, conversation_id, sender_role, message_type, content, created_at)
     VALUES (?, ?, 'system', 'service_card', ?, ?)`
  )
    .bind(crypto.randomUUID(), conversationId, serviceCardMessage, now)
    .run();

  if (body.initialMessage?.trim()) {
    await c.env.DB.prepare(
      `INSERT INTO market_messages (id, conversation_id, sender_role, message_type, content, created_at)
       VALUES (?, ?, 'customer', 'text', ?, ?)`
    )
      .bind(crypto.randomUUID(), conversationId, body.initialMessage.trim(), now + 1)
      .run();

    await c.env.DB.prepare('UPDATE market_conversations SET last_message_at = ?, updated_at = ? WHERE id = ?')
      .bind(now + 1, now + 1, conversationId)
      .run();
  }

  const created = await c.env.DB.prepare('SELECT * FROM market_conversations WHERE id = ?')
    .bind(conversationId)
    .first<DbConversationRow>();

  return c.json<ApiResponse<MarketplaceConversation>>({ success: true, data: transformConversation(created!) }, 201);
});

// -------- Conversation / Message / Order endpoints --------
marketRouter.get('/conversations/:conversationId', async (c) => {
  const conversationId = c.req.param('conversationId');

  const conversation = await c.env.DB.prepare('SELECT * FROM market_conversations WHERE id = ?')
    .bind(conversationId)
    .first<DbConversationRow>();

  if (!conversation) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Conversation not found' }, 404);
  }

  const agent = await c.env.DB.prepare(`${AGENT_MARKET_SELECT} WHERE a.id = ? AND a.deleted_at IS NULL`)
    .bind(conversation.agent_id)
    .first<DbAgentMarketRow>();

  const service = conversation.service_id
    ? await c.env.DB.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).bind(conversation.service_id).first<DbServiceRow>()
    : null;

  const latestOrder = await c.env.DB.prepare(
    `SELECT * FROM market_orders WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`
  )
    .bind(conversationId)
    .first<DbOrderRow>();

  return c.json<ApiResponse<{
    conversation: MarketplaceConversation;
    agent: MarketplaceAgent;
    service: MarketplaceService | null;
    latestOrder: MarketplaceOrder | null;
  }>>({
    success: true,
    data: {
      conversation: transformConversation(conversation),
      agent: transformAgent(agent!, Date.now()),
      service: service ? transformService(service) : null,
      latestOrder: latestOrder ? transformOrder(latestOrder) : null,
    },
  });
});

marketRouter.get('/conversations/:conversationId/messages', async (c) => {
  const conversationId = c.req.param('conversationId');
  const rows = await c.env.DB.prepare(
    `SELECT * FROM market_messages WHERE conversation_id = ? ORDER BY created_at ASC`
  )
    .bind(conversationId)
    .all<DbMessageRow>();

  return c.json<ApiResponse<MarketplaceMessage[]>>({
    success: true,
    data: (rows.results || []).map(transformMessage),
  });
});

marketRouter.post('/conversations/:conversationId/messages', async (c) => {
  const conversationId = c.req.param('conversationId');
  const body = await c.req.json<CreateMarketplaceMessageRequest>();

  if (!body.content || !body.content.trim()) {
    return c.json<ApiResponse<null>>({ success: false, error: 'content is required' }, 400);
  }

  if (!['customer', 'agent', 'system'].includes(body.senderRole)) {
    return c.json<ApiResponse<null>>({ success: false, error: 'invalid senderRole' }, 400);
  }

  const now = Date.now();
  const messageId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO market_messages (id, conversation_id, sender_role, message_type, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      messageId,
      conversationId,
      body.senderRole,
      body.messageType || 'text',
      body.content.trim(),
      now
    )
    .run();

  await c.env.DB.prepare('UPDATE market_conversations SET last_message_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, conversationId)
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM market_messages WHERE id = ?').bind(messageId).first<DbMessageRow>();

  return c.json<ApiResponse<MarketplaceMessage>>({ success: true, data: transformMessage(row!) }, 201);
});

marketRouter.get('/conversations/:conversationId/orders', async (c) => {
  const conversationId = c.req.param('conversationId');
  const rows = await c.env.DB.prepare(
    `SELECT * FROM market_orders WHERE conversation_id = ? ORDER BY created_at DESC`
  )
    .bind(conversationId)
    .all<DbOrderRow>();

  return c.json<ApiResponse<MarketplaceOrder[]>>({
    success: true,
    data: (rows.results || []).map(transformOrder),
  });
});

marketRouter.post('/conversations/:conversationId/orders', async (c) => {
  const conversationId = c.req.param('conversationId');
  const body = (await parseOptionalJson<CreateMarketplaceOrderRequest>(c.req.raw)) || {};

  const conversation = await c.env.DB.prepare('SELECT * FROM market_conversations WHERE id = ?')
    .bind(conversationId)
    .first<DbConversationRow>();

  if (!conversation) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Conversation not found' }, 404);
  }

  if (!conversation.service_id) {
    return c.json<ApiResponse<null>>({ success: false, error: 'This conversation is consult-only and cannot create order yet' }, 409);
  }

  const existing = await c.env.DB.prepare(
    `SELECT * FROM market_orders WHERE conversation_id = ? AND status IN ('pending_payment', 'in_progress', 'pending_acceptance') LIMIT 1`
  )
    .bind(conversationId)
    .first<DbOrderRow>();

  if (existing) {
    return c.json<ApiResponse<MarketplaceOrder>>({ success: true, data: transformOrder(existing) });
  }

  const service = await c.env.DB.prepare('SELECT id, price_cents FROM market_services WHERE id = ?')
    .bind(conversation.service_id)
    .first<{ id: string; price_cents: number }>();

  if (!service) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Service not found' }, 404);
  }

  const amountCents = body.amountCents && body.amountCents > 0 ? body.amountCents : service.price_cents;
  const now = Date.now();
  const orderId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO market_orders (
      id, conversation_id, service_id, agent_id, amount_cents, platform_fee_rate, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`
  )
    .bind(orderId, conversationId, conversation.service_id, conversation.agent_id, amountCents, PLATFORM_FEE_RATE, now, now)
    .run();

  const order = await c.env.DB.prepare('SELECT * FROM market_orders WHERE id = ?').bind(orderId).first<DbOrderRow>();

  return c.json<ApiResponse<MarketplaceOrder>>({ success: true, data: transformOrder(order!) }, 201);
});

async function transitionOrderStatus(
  db: Env['DB'],
  orderId: string,
  fromStatus: DbOrderRow['status'],
  toStatus: DbOrderRow['status']
): Promise<DbOrderRow | null> {
  const now = Date.now();
  const result = await db.prepare(
    `UPDATE market_orders
     SET status = ?, updated_at = ?, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END
     WHERE id = ? AND status = ?`
  )
    .bind(toStatus, now, toStatus, now, orderId, fromStatus)
    .run();

  if (!result.success || result.meta.changes === 0) {
    return null;
  }

  return db.prepare('SELECT * FROM market_orders WHERE id = ?').bind(orderId).first<DbOrderRow>();
}

marketRouter.post('/orders/:orderId/pay', async (c) => {
  const orderId = c.req.param('orderId');
  const next = await transitionOrderStatus(c.env.DB, orderId, 'pending_payment', 'in_progress');

  if (!next) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Order status transition failed' }, 409);
  }

  return c.json<ApiResponse<MarketplaceOrder>>({ success: true, data: transformOrder(next) });
});

marketRouter.post('/orders/:orderId/submit-delivery', async (c) => {
  const orderId = c.req.param('orderId');
  const next = await transitionOrderStatus(c.env.DB, orderId, 'in_progress', 'pending_acceptance');

  if (!next) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Order status transition failed' }, 409);
  }

  return c.json<ApiResponse<MarketplaceOrder>>({ success: true, data: transformOrder(next) });
});

marketRouter.post('/orders/:orderId/complete', async (c) => {
  const orderId = c.req.param('orderId');
  const next = await transitionOrderStatus(c.env.DB, orderId, 'pending_acceptance', 'completed');

  if (!next) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Order status transition failed' }, 409);
  }

  return c.json<ApiResponse<MarketplaceOrder>>({ success: true, data: transformOrder(next) });
});

marketRouter.post('/orders/:orderId/reviews', async (c) => {
  const orderId = c.req.param('orderId');
  const body = await c.req.json<CreateMarketplaceReviewRequest>();

  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return c.json<ApiResponse<null>>({ success: false, error: 'rating must be an integer between 1 and 5' }, 400);
  }

  const order = await c.env.DB.prepare('SELECT status FROM market_orders WHERE id = ?').bind(orderId).first<{ status: string }>();
  if (!order) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Order not found' }, 404);
  }

  if (order.status !== 'completed') {
    return c.json<ApiResponse<null>>({ success: false, error: 'Order must be completed before review' }, 409);
  }

  const now = Date.now();
  const reviewId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO market_reviews (id, order_id, rating, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       rating = excluded.rating,
       comment = excluded.comment,
       updated_at = excluded.updated_at`
  )
    .bind(reviewId, orderId, body.rating, body.comment?.trim() || null, now, now)
    .run();

  const review = await c.env.DB.prepare('SELECT * FROM market_reviews WHERE order_id = ?').bind(orderId).first<{
    id: string;
    order_id: string;
    rating: number;
    comment: string | null;
    created_at: number;
    updated_at: number;
  }>();

  return c.json<ApiResponse<{
    id: string;
    orderId: string;
    rating: number;
    comment?: string;
    createdAt: number;
    updatedAt: number;
  }>>({
    success: true,
    data: {
      id: review!.id,
      orderId: review!.order_id,
      rating: review!.rating,
      comment: review!.comment || undefined,
      createdAt: review!.created_at,
      updatedAt: review!.updated_at,
    },
  });
});
