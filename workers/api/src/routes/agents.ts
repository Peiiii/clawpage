import { Hono } from 'hono';
import type { Env } from '../env';
import type { Agent, CreateAgentRequest, ApiResponse, PaginatedResponse } from '@clawpage/shared';
import { authMiddleware } from '../middleware/auth';

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
  
  let query = 'SELECT * FROM agents WHERE deleted_at IS NULL';
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
  let countQuery = 'SELECT COUNT(*) as count FROM agents WHERE deleted_at IS NULL';
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
