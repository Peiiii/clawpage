import { Hono } from 'hono';
import type { Env } from '../env';
import type { Message, SendMessageRequest, StreamMessageRequest, AgentReplyRequest, ApiResponse, PaginatedResponse } from '@clawpage/shared';
import { agentAuthMiddleware } from '../middleware/auth';
import { DbMessage, dbMessageToMessage, dbMessagesToMessages } from '../utils/transform';

export const messagesRouter = new Hono<{ Bindings: Env }>();

type AgentGatewayConfig = {
  gateway_url: string;
  auth_mode: 'token' | 'password';
  auth_token: string;
  gateway_agent_id: string | null;
};

type AgentConnector = {
  id: string;
};

function buildGatewaySessionKey(params: { gatewayAgentId?: string | null; sessionId: string }) {
  const agentId = (params.gatewayAgentId || 'main').trim() || 'main';
  const mainKey = `openai-user:clawbay:${params.sessionId}`;
  return `agent:${agentId}:${mainKey}`;
}

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function loadAgentGateway(db: Env['DB'], agentId: string) {
  return db.prepare(
    'SELECT gateway_url, auth_mode, auth_token, gateway_agent_id FROM agent_gateways WHERE agent_id = ?'
  ).bind(agentId).first<AgentGatewayConfig>();
}

async function loadAgentConnector(db: Env['DB'], agentId: string) {
  return db.prepare(
    'SELECT id FROM clawbay_connectors WHERE agent_id = ?'
  ).bind(agentId).first<AgentConnector>();
}

async function upsertGatewaySession(db: Env['DB'], params: { agentId: string; sessionId: string; gatewaySessionKey: string }) {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO gateway_sessions (
      id,
      agent_id,
      session_id,
      gateway_session_key,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id, session_id)
    DO UPDATE SET gateway_session_key = ?, updated_at = ?
  `).bind(
    id,
    params.agentId,
    params.sessionId,
    params.gatewaySessionKey,
    now,
    now,
    params.gatewaySessionKey,
    now
  ).run();
}

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
  `).bind(agent.id, sessionId, limit).all<DbMessage>();

  return c.json<PaginatedResponse<Message>>({
    items: dbMessagesToMessages(messages.results || []),
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

  const message = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<DbMessage>();

  return c.json<ApiResponse<Message>>({ success: true, data: dbMessageToMessage(message!) }, 201);
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

  const message = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<DbMessage>();

  return c.json<ApiResponse<Message>>({ success: true, data: dbMessageToMessage(message!) }, 201);
});

// 用户发送消息（流式）
messagesRouter.post('/stream', async (c) => {
  const body = await c.req.json<StreamMessageRequest & { agentSlug: string }>();

  if (!body.agentSlug || !body.sessionId || !body.content) {
    return c.json<ApiResponse<null>>({ success: false, error: 'agentSlug, sessionId, content required' }, 400);
  }

  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(body.agentSlug).first<{ id: string }>();

  if (!agent) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Agent not found' }, 404);
  }

  const connector = await loadAgentConnector(c.env.DB, agent.id);
  if (connector) {
    const stub = c.env.CLAWBAY_CONNECTOR.get(c.env.CLAWBAY_CONNECTOR.idFromName(agent.id));
    return stub.fetch('https://clawbay-connector/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: agent.id,
        sessionId: body.sessionId,
        content: body.content,
      }),
    });
  }

  const gateway = await loadAgentGateway(c.env.DB, agent.id);
  if (!gateway) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Gateway not configured' }, 400);
  }

  const runId = crypto.randomUUID();
  const userMessageId = crypto.randomUUID();
  const now = Date.now();

  await c.env.DB.prepare(`
    INSERT INTO messages (id, agent_id, session_id, role, content, status, created_at)
    VALUES (?, ?, ?, 'user', ?, 'pending', ?)
  `).bind(userMessageId, agent.id, body.sessionId, body.content, now).run();

  const gatewaySessionKey = buildGatewaySessionKey({
    gatewayAgentId: gateway.gateway_agent_id,
    sessionId: body.sessionId,
  });
  await upsertGatewaySession(c.env.DB, {
    agentId: agent.id,
    sessionId: body.sessionId,
    gatewaySessionKey,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const abortController = new AbortController();
  const clientSignal = c.req.raw.signal;
  clientSignal?.addEventListener('abort', () => abortController.abort(), { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      sendEvent('ack', { runId, messageId: userMessageId });

      const gatewayUrl = new URL('/v1/chat/completions', gateway.gateway_url).toString();
      const model = gateway.gateway_agent_id ? `openclaw:${gateway.gateway_agent_id}` : 'openclaw';
      const payload = {
        model,
        stream: true,
        user: `clawbay:${body.sessionId}`,
        messages: [{ role: 'user', content: body.content }],
      };

      let upstream: Response;
      try {
        upstream = await fetch(gatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${gateway.auth_token}`,
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });
      } catch (err) {
        await c.env.DB.prepare(
          'UPDATE messages SET status = ? WHERE id = ?'
        ).bind('failed', userMessageId).run();
        sendEvent('error', { runId, error: String(err) });
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        await c.env.DB.prepare(
          'UPDATE messages SET status = ? WHERE id = ?'
        ).bind('failed', userMessageId).run();
        sendEvent('error', { runId, error: `Gateway error: ${upstream.status}` });
        controller.close();
        return;
      }

      await c.env.DB.prepare(
        'UPDATE messages SET status = ? WHERE id = ?'
      ).bind('sent', userMessageId).run();

      const reader = upstream.body.getReader();
      let buffer = '';
      let assistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let idx = buffer.indexOf('\n\n');
        while (idx !== -1) {
          const chunk = buffer.slice(0, idx).replace(/\r/g, '');
          buffer = buffer.slice(idx + 2);

          const lines = chunk.split('\n');
          const dataLines = lines
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());
          const data = dataLines.join('\n').trim();
          if (!data) {
            idx = buffer.indexOf('\n\n');
            continue;
          }

          if (data === '[DONE]') {
            idx = buffer.indexOf('\n\n');
            continue;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
            };
            const choice = parsed.choices?.[0];
            const delta = choice?.delta?.content ?? choice?.message?.content ?? '';
            if (delta) {
              assistantText += delta;
              sendEvent('delta', { runId, delta });
            }
          } catch {
            sendEvent('error', { runId, error: 'Invalid gateway stream payload' });
          }

          idx = buffer.indexOf('\n\n');
        }
      }

      if (assistantText.trim()) {
        const agentMessageId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO messages (id, agent_id, session_id, role, content, status, created_at)
          VALUES (?, ?, ?, 'agent', ?, 'delivered', ?)
        `).bind(agentMessageId, agent.id, body.sessionId, assistantText, Date.now()).run();
        sendEvent('final', { runId, content: assistantText, messageId: agentMessageId });
      } else {
        sendEvent('final', { runId, content: '' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});

// 获取待处理消息（Agent 用，需认证）
messagesRouter.get('/pending', agentAuthMiddleware, async (c) => {
  const agentId = c.get('agentId');

  const messages = await c.env.DB.prepare(`
    SELECT * FROM messages 
    WHERE agent_id = ? AND role = 'user' AND status = 'pending'
    ORDER BY created_at ASC
  `).bind(agentId).all<DbMessage>();

  return c.json<PaginatedResponse<Message>>({
    items: dbMessagesToMessages(messages.results || []),
    total: messages.results?.length || 0,
    page: 1,
    pageSize: 100,
    hasMore: false,
  });
});
