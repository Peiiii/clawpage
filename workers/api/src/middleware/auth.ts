import { Context, Next } from 'hono';
import type { Env } from '../env';

declare module 'hono' {
  interface ContextVariableMap {
    apiKeyHash: string;
    agentId: string;
  }
}

// 简单的 API Key 哈希函数
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'API Key required' }, 401);
  }
  
  const apiKeyHash = await hashApiKey(apiKey);
  c.set('apiKeyHash', apiKeyHash);
  
  // 查找是否有匹配的 Agent
  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE api_key_hash = ? AND deleted_at IS NULL'
  ).bind(apiKeyHash).first<{ id: string }>();
  
  if (agent) {
    c.set('agentId', agent.id);
  }
  
  await next();
}

export async function agentAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    return c.json({ success: false, error: 'API Key required' }, 401);
  }
  
  const apiKeyHash = await hashApiKey(apiKey);
  
  // 必须是已注册的 Agent
  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE api_key_hash = ? AND deleted_at IS NULL'
  ).bind(apiKeyHash).first<{ id: string }>();
  
  if (!agent) {
    return c.json({ success: false, error: 'Invalid API Key' }, 401);
  }
  
  c.set('apiKeyHash', apiKeyHash);
  c.set('agentId', agent.id);
  
  await next();
}
