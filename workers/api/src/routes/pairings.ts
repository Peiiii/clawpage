import { Hono } from 'hono';
import type { Env } from '../env';
import type { ApiResponse, Agent } from '@clawpage/shared';

export const pairingsRouter = new Hono<{ Bindings: Env }>();

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generatePairingCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiKey(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `clp_${uuid}`;
}

pairingsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    description?: string;
    avatarUrl?: string;
    tags?: string[];
  }>();

  if (!body.name || !body.name.trim()) {
    return c.json<ApiResponse<null>>({ success: false, error: 'name required' }, 400);
  }

  let slug = body.slug?.trim().toLowerCase();
  if (!slug) {
    slug = slugify(body.name);
  }

  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: 'slug must contain only lowercase letters, numbers, and hyphens' },
      400
    );
  }

  if (slug) {
    const existing = await c.env.DB.prepare('SELECT id FROM agents WHERE slug = ?')
      .bind(slug)
      .first();
    if (existing) {
      return c.json<ApiResponse<null>>({ success: false, error: 'This slug is already taken' }, 409);
    }
  }

  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000;
  const code = generatePairingCode();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO clawbay_pairings (id, code, agent_name, agent_slug, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  )
    .bind(id, code, body.name.trim(), slug || null, now, expiresAt)
    .run();

  return c.json<ApiResponse<{ code: string; expiresAt: number; agentSlug?: string }>>({
    success: true,
    data: { code, expiresAt, agentSlug: slug || undefined },
  });
});

pairingsRouter.post('/claim', async (c) => {
  const body = await c.req.json<{
    code?: string;
    agentName?: string;
    agentSlug?: string;
  }>();

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return c.json<ApiResponse<null>>({ success: false, error: 'code required' }, 400);
  }

  const now = Date.now();
  const pairing = await c.env.DB.prepare(
    'SELECT * FROM clawbay_pairings WHERE code = ?'
  )
    .bind(code)
    .first<{
      id: string;
      agent_name: string | null;
      agent_slug: string | null;
      status: string;
      expires_at: number;
    }>();

  if (!pairing || pairing.status !== 'pending' || pairing.expires_at < now) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Invalid or expired code' }, 400);
  }

  const agentName = (pairing.agent_name || body.agentName || 'Claw').trim();
  let agentSlug =
    pairing.agent_slug?.trim().toLowerCase() ||
    body.agentSlug?.trim().toLowerCase() ||
    `claw-${code.toLowerCase()}`;

  if (!/^[a-z0-9-]+$/.test(agentSlug)) {
    agentSlug = `claw-${code.toLowerCase()}`;
  }

  const exists = await c.env.DB.prepare('SELECT id FROM agents WHERE slug = ?')
    .bind(agentSlug)
    .first();
  if (exists) {
    agentSlug = `${agentSlug}-${code.toLowerCase().slice(0, 3)}`;
  }

  const agentId = crypto.randomUUID();
  const apiKey = generateApiKey();
  const apiKeyHash = await crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(apiKey))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );

  await c.env.DB.prepare(
    `INSERT INTO agents (id, slug, name, avatar_url, description, tags, webhook_url, api_key_hash, claim_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      agentId,
      agentSlug,
      agentName,
      null,
      null,
      JSON.stringify([]),
      null,
      apiKeyHash,
      null,
      now,
      now
    )
    .run();

  const connectorId = crypto.randomUUID();
  const connectorToken = crypto.randomUUID().replace(/-/g, '');
  const connectorHash = await hashToken(connectorToken);

  await c.env.DB.prepare(
    `INSERT INTO clawbay_connectors (id, agent_id, token_hash, created_at, updated_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(connectorId, agentId, connectorHash, now, now, now)
    .run();

  await c.env.DB.prepare(
    'UPDATE clawbay_pairings SET status = ?, claimed_at = ? WHERE id = ?'
  )
    .bind('claimed', now, pairing.id)
    .run();

  const agent: Agent = {
    id: agentId,
    slug: agentSlug,
    name: agentName,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };

  return c.json<ApiResponse<{ agent: Agent; connectorToken: string }>>({
    success: true,
    data: { agent, connectorToken },
  });
});
