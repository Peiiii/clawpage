import { Hono } from 'hono';
import type { Env } from '../env';
import type { Agent, CreateAgentRequest, ApiResponse, PaginatedResponse, GatewayConfigRequest } from '@clawpage/shared';
import { authMiddleware, agentAuthMiddleware } from '../middleware/auth';

export const agentsRouter = new Hono<{ Bindings: Env }>();

// 数据库记录到 API 响应的转换
interface DbAgent {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  tags: string | null;
  webhook_url: string | null;
  api_key_hash: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function transformAgent(dbAgent: DbAgent): Agent {
  return {
    id: dbAgent.id,
    slug: dbAgent.slug,
    name: dbAgent.name,
    avatarUrl: dbAgent.avatar_url || undefined,
    description: dbAgent.description || undefined,
    tags: dbAgent.tags ? JSON.parse(dbAgent.tags) : [],
    createdAt: dbAgent.created_at,
    updatedAt: dbAgent.updated_at,
  };
}

// 获取 Agent 列表（公开）
agentsRouter.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const search = c.req.query('search') || '';
  const tag = c.req.query('tag') || '';
  
  const offset = (page - 1) * pageSize;
  
  let query = 'SELECT * FROM agents WHERE deleted_at IS NULL AND claimed_at IS NOT NULL';
  const params: (string | number)[] = [];
  
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (tag) {
    query += ' AND tags LIKE ?';
    params.push(`%"${tag}"%`);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);
  
  const agents = await c.env.DB.prepare(query).bind(...params).all<DbAgent>();
  
  // 获取总数
  let countQuery = 'SELECT COUNT(*) as count FROM agents WHERE deleted_at IS NULL AND claimed_at IS NOT NULL';
  const countParams: string[] = [];
  if (search) {
    countQuery += ' AND (name LIKE ? OR description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    countQuery += ' AND tags LIKE ?';
    countParams.push(`%"${tag}"%`);
  }
  
  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
  const total = countResult?.count || 0;
  
  const response: PaginatedResponse<Agent> = {
    items: (agents.results || []).map(transformAgent),
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
  
  return c.json(response);
});

// 获取单个 Agent（公开）
agentsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  const agent = await c.env.DB.prepare(
    'SELECT * FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(slug).first<DbAgent>();
  
  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }
  
  return c.json<ApiResponse<Agent>>({ success: true, data: transformAgent(agent) });
});

// 创建/更新 Agent（需认证）
agentsRouter.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<CreateAgentRequest>();
  const apiKeyHash = c.get('apiKeyHash');
  
  const now = Date.now();
  const id = crypto.randomUUID();
  
  // 检查 slug 是否已存在
  const existing = await c.env.DB.prepare(
    'SELECT id, api_key_hash FROM agents WHERE slug = ?'
  ).bind(body.slug).first<{ id: string; api_key_hash: string }>();
  
  if (existing) {
    // 验证是否是同一个 Agent 的更新
    if (existing.api_key_hash !== apiKeyHash) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Slug already taken' }, 409);
    }
    
    // 更新现有 Agent
    await c.env.DB.prepare(`
      UPDATE agents SET 
        name = ?, avatar_url = ?, description = ?, tags = ?, webhook_url = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      body.name,
      body.avatarUrl || null,
      body.description || null,
      JSON.stringify(body.tags || []),
      body.webhookUrl || null,
      now,
      existing.id
    ).run();
    
    const updated = await c.env.DB.prepare(
      'SELECT * FROM agents WHERE id = ?'
    ).bind(existing.id).first<Agent>();
    
    return c.json<ApiResponse<Agent>>({ success: true, data: updated! });
  }
  
  // 创建新 Agent
  await c.env.DB.prepare(`
    INSERT INTO agents (id, slug, name, avatar_url, description, tags, webhook_url, api_key_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.slug,
    body.name,
    body.avatarUrl || null,
    body.description || null,
    JSON.stringify(body.tags || []),
    body.webhookUrl || null,
    apiKeyHash,
    now,
    now
  ).run();
  
  const newAgent = await c.env.DB.prepare(
    'SELECT * FROM agents WHERE id = ?'
  ).bind(id).first<Agent>();
  
  return c.json<ApiResponse<Agent>>({ success: true, data: newAgent! }, 201);
});

// 配置 Agent Gateway（需认证）
agentsRouter.put('/:slug/gateway', agentAuthMiddleware, async (c) => {
  const slug = c.req.param('slug');
  const agentId = c.get('agentId');
  const body = await c.req.json<GatewayConfigRequest>();

  if (!body.gatewayUrl || !body.authToken) {
    return c.json<ApiResponse<null>>({ success: false, error: 'gatewayUrl and authToken required' }, 400);
  }

  const gatewayUrl = body.gatewayUrl.trim();
  if (!gatewayUrl.startsWith('http://') && !gatewayUrl.startsWith('https://')) {
    return c.json<ApiResponse<null>>({ success: false, error: 'gatewayUrl must be http or https' }, 400);
  }

  const authMode = body.authMode === 'password' ? 'password' : 'token';
  const gatewayAgentId = body.gatewayAgentId?.trim() || null;

  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(slug).first<{ id: string }>();

  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }

  if (agent.id !== agentId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }

  const now = Date.now();
  const existing = await c.env.DB.prepare(
    'SELECT agent_id FROM agent_gateways WHERE agent_id = ?'
  ).bind(agentId).first<{ agent_id: string }>();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE agent_gateways SET
        gateway_url = ?,
        auth_mode = ?,
        auth_token = ?,
        gateway_agent_id = ?,
        updated_at = ?
      WHERE agent_id = ?
    `).bind(
      gatewayUrl,
      authMode,
      body.authToken,
      gatewayAgentId,
      now,
      agentId
    ).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO agent_gateways (
        agent_id,
        gateway_url,
        auth_mode,
        auth_token,
        gateway_agent_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      agentId,
      gatewayUrl,
      authMode,
      body.authToken,
      gatewayAgentId,
      now,
      now
    ).run();
  }

  return c.json<ApiResponse<{
    gatewayUrl: string;
    authMode: string;
    gatewayAgentId: string | null;
    updatedAt: number;
  }>>({
    success: true,
    data: {
      gatewayUrl,
      authMode,
      gatewayAgentId,
      updatedAt: now,
    },
  });
});

// 删除 Agent（需认证）
agentsRouter.delete('/:slug', authMiddleware, async (c) => {
  const slug = c.req.param('slug');
  const apiKeyHash = c.get('apiKeyHash');
  
  const agent = await c.env.DB.prepare(
    'SELECT id, api_key_hash FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(slug).first<{ id: string; api_key_hash: string }>();
  
  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }
  
  if (agent.api_key_hash !== apiKeyHash) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }
  
  // 软删除
  await c.env.DB.prepare(
    'UPDATE agents SET deleted_at = ? WHERE id = ?'
  ).bind(Date.now(), agent.id).run();
  
  return c.json<ApiResponse<null>>({ success: true });
});

// ========================
// Agent 自主注册流程
// ========================

// 生成随机认领码
function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成 API Key
function generateApiKey(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `clp_${uuid}`;
}

function generateConnectorToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 注册请求类型
interface RegisterRequest {
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  tags?: string[];
  webhookUrl?: string;
}

// Agent 自主注册（无需认证）
agentsRouter.post('/register', async (c) => {
  const body = await c.req.json<RegisterRequest>();
  
  // 验证必填字段
  if (!body.name || !body.slug) {
    return c.json<ApiResponse<null>>({ 
      success: false, 
      error: 'name and slug are required' 
    }, 400);
  }
  
  // 验证 slug 格式
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return c.json<ApiResponse<null>>({ 
      success: false, 
      error: 'slug must contain only lowercase letters, numbers, and hyphens' 
    }, 400);
  }
  
  // 检查 slug 是否已存在
  const existing = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ?'
  ).bind(body.slug).first();
  
  if (existing) {
    return c.json<ApiResponse<null>>({ 
      success: false, 
      error: 'This slug is already taken' 
    }, 409);
  }
  
  const now = Date.now();
  const id = crypto.randomUUID();
  const claimCode = generateClaimCode();
  const apiKey = generateApiKey();
  const apiKeyHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(apiKey)
  ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
  
  // 创建未认领的 Agent
  await c.env.DB.prepare(`
    INSERT INTO agents (id, slug, name, avatar_url, description, tags, webhook_url, api_key_hash, claim_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.slug,
    body.name,
    body.avatarUrl || null,
    body.description || null,
    JSON.stringify(body.tags || []),
    body.webhookUrl || null,
    apiKeyHash,
    claimCode,
    now,
    now
  ).run();

  const connectorId = crypto.randomUUID();
  const connectorToken = generateConnectorToken();
  const connectorTokenHash = await hashToken(connectorToken);

  await c.env.DB.prepare(`
    INSERT INTO clawbay_connectors (id, agent_id, token_hash, created_at, updated_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    connectorId,
    id,
    connectorTokenHash,
    now,
    now,
    now
  ).run();

  const requestUrl = new URL(c.req.url);
  const apiBase = `${requestUrl.protocol}//${requestUrl.host}`;
  const connectorUrl = apiBase.replace(/^http/, 'ws') + `/connectors/ws?token=${connectorToken}`;
  
  return c.json({
    success: true,
    data: {
      claimCode,
      apiKey,
      agentUrl: `https://clawbay.ai/a/${body.slug}`,
      connectorToken,
      connectorUrl,
      message: '请将 claimCode 发送给用户，在 ClawBay 完成认领。认领完成后，Agent 将在平台上显示。'
    }
  }, 201);
});

// 用户认领 Agent
agentsRouter.post('/claim', async (c) => {
  const body = await c.req.json<{ claimCode: string }>();
  
  if (!body.claimCode) {
    return c.json<ApiResponse<null>>({ 
      success: false, 
      error: 'claimCode is required' 
    }, 400);
  }
  
  const code = body.claimCode.toUpperCase().trim();
  
  // 查找未认领的 Agent
  const agent = await c.env.DB.prepare(
    'SELECT * FROM agents WHERE claim_code = ? AND claimed_at IS NULL AND deleted_at IS NULL'
  ).bind(code).first<DbAgent & { claim_code: string; claimed_at: number | null }>();
  
  if (!agent) {
    return c.json<ApiResponse<null>>({ 
      success: false, 
      error: '认领码无效或已被使用' 
    }, 404);
  }
  
  // 标记为已认领
  const now = Date.now();
  await c.env.DB.prepare(
    'UPDATE agents SET claimed_at = ?, updated_at = ? WHERE id = ?'
  ).bind(now, now, agent.id).run();
  
  return c.json({
    success: true,
    data: {
      agent: transformAgent(agent),
      message: '认领成功！Agent 已激活并在平台上显示。'
    }
  });
});
