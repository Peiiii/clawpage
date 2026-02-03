import { Hono } from 'hono';
import type { Env } from '../env';
import type { ApiResponse } from '@clawpage/shared';

export const connectorsRouter = new Hono<{ Bindings: Env }>();

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

connectorsRouter.get('/ws', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json<ApiResponse<null>>({ success: false, error: 'token required' }, 400);
  }

  const tokenHash = await hashToken(token);
  const connector = await c.env.DB.prepare(
    'SELECT agent_id FROM clawbay_connectors WHERE token_hash = ?'
  )
    .bind(tokenHash)
    .first<{ agent_id: string }>();

  if (!connector) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Invalid token' }, 401);
  }

  const id = c.env.CLAWBAY_CONNECTOR.idFromName(connector.agent_id);
  const stub = c.env.CLAWBAY_CONNECTOR.get(id);
  const url = new URL(c.req.url);
  url.pathname = '/connect';
  return stub.fetch(url.toString(), c.req.raw);
});
