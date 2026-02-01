import { Hono } from 'hono';
import type { Env } from '../env';
import type { Message, SendMessageRequest, AgentReplyRequest, ApiResponse, PaginatedResponse } from '@clawpage/shared';
import { agentAuthMiddleware } from '../middleware/auth';

export const messagesRouter = new Hono<{ Bindings: Env }>();

// 获取消息历史（公开）
messagesRouter.get('/', async (c) => {
  const agentSlug = c.req.query('agent');
  const sessionId = c.req.query('sessionId');
  const limit = parseInt(c.req.query('limit') || '50');
  
  if (!agentSlug || !sessionId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'agent and sessionId required' }, 400);
  }
  
  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(agentSlug).first<{ id: string }>();
  
  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }
  
  const messages = await c.env.DB.prepare(`
    SELECT * FROM messages 
    WHERE agent_id = ? AND session_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `).bind(agent.id, sessionId, limit).all<Message>();
  
  return c.json<PaginatedResponse<Message>>({
    items: messages.results || [],
    total: messages.results?.length || 0,
    page: 1,
    pageSize: limit,
    hasMore: false,
  });
});

// 用户发送消息（公开）
messagesRouter.post('/send', async (c) => {
  const body = await c.req.json<SendMessageRequest & { agentSlug: string }>();
  
  if (!body.agentSlug || !body.sessionId || !body.content) {
    return c.json<ApiResponse<null>>({ success: false, error: 'agentSlug, sessionId, content required' }, 400);
  }
  
  const agent = await c.env.DB.prepare(
    'SELECT id, webhook_url FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(body.agentSlug).first<{ id: string; webhook_url: string | null }>();
  
  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }
  
  const id = crypto.randomUUID();
  const now = Date.now();
  
  // 保存用户消息
  await c.env.DB.prepare(`
    INSERT INTO messages (id, agent_id, session_id, role, content, status, created_at)
    VALUES (?, ?, ?, 'user', ?, 'pending', ?)
  `).bind(id, agent.id, body.sessionId, body.content, now).run();
  
  // 如果有 webhook，转发消息
  if (agent.webhook_url) {
    try {
      const response = await fetch(agent.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          messageId: id,
          sessionId: body.sessionId,
          content: body.content,
          timestamp: now,
        }),
      });
      
      await c.env.DB.prepare(
        'UPDATE messages SET status = ? WHERE id = ?'
      ).bind(response.ok ? 'sent' : 'failed', id).run();
    } catch {
      await c.env.DB.prepare(
        'UPDATE messages SET status = ? WHERE id = ?'
      ).bind('failed', id).run();
    }
  }
  
  const message = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<Message>();
  
  return c.json<ApiResponse<Message>>({ success: true, data: message! }, 201);
});

// Agent 回复消息（需认证）
messagesRouter.post('/reply', agentAuthMiddleware, async (c) => {
  const body = await c.req.json<AgentReplyRequest>();
  const agentId = c.get('agentId');
  
  if (!body.sessionId || !body.content) {
    return c.json<ApiResponse<null>>({ success: false, error: 'sessionId and content required' }, 400);
  }
  
  const id = crypto.randomUUID();
  const now = Date.now();
  
  // 保存 Agent 回复
  await c.env.DB.prepare(`
    INSERT INTO messages (id, agent_id, session_id, role, content, status, created_at)
    VALUES (?, ?, ?, 'agent', ?, 'delivered', ?)
  `).bind(id, agentId, body.sessionId, body.content, now).run();
  
  const message = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<Message>();
  
  return c.json<ApiResponse<Message>>({ success: true, data: message! }, 201);
});

// 获取待处理消息（Agent 用，需认证）
messagesRouter.get('/pending', agentAuthMiddleware, async (c) => {
  const agentId = c.get('agentId');
  
  const messages = await c.env.DB.prepare(`
    SELECT * FROM messages 
    WHERE agent_id = ? AND role = 'user' AND status = 'pending'
    ORDER BY created_at ASC
  `).bind(agentId).all<Message>();
  
  return c.json<PaginatedResponse<Message>>({
    items: messages.results || [],
    total: messages.results?.length || 0,
    page: 1,
    pageSize: 100,
    hasMore: false,
  });
});
