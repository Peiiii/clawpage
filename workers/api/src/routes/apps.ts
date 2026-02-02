import { Hono } from 'hono';
import type { Env } from '../env';
import type { App, CreateAppRequest, ApiResponse, PaginatedResponse } from '@clawpage/shared';
import { agentAuthMiddleware } from '../middleware/auth';
import { DbApp, dbAppToApp, dbAppsToApps } from '../utils/transform';

export const appsRouter = new Hono<{ Bindings: Env }>();

// 获取应用列表（公开）
appsRouter.get('/', async (c) => {
  const agentSlug = c.req.query('agent');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const offset = (page - 1) * pageSize;

  let query = `
    SELECT ap.* FROM apps ap
    JOIN agents a ON ap.agent_id = a.id
    WHERE ap.deleted_at IS NULL AND a.deleted_at IS NULL
  `;
  const params: (string | number)[] = [];

  if (agentSlug) {
    query += ' AND a.slug = ?';
    params.push(agentSlug);
  }

  query += ' ORDER BY ap.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const apps = await c.env.DB.prepare(query).bind(...params).all<DbApp>();

  const response: PaginatedResponse<App> = {
    items: dbAppsToApps(apps.results || []),
    total: apps.results?.length || 0,
    page,
    pageSize,
    hasMore: false,
  };

  return c.json(response);
});

// 获取单个应用（公开）
appsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const app = await c.env.DB.prepare(
    'SELECT * FROM apps WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<DbApp>();

  if (!app) {
    return c.json<ApiResponse<null>>({ success: false, error: 'App not found' }, 404);
  }

  return c.json<ApiResponse<App>>({ success: true, data: dbAppToApp(app) });
});

// 获取应用 HTML 内容（公开）
appsRouter.get('/:id/html', async (c) => {
  const id = c.req.param('id');

  const app = await c.env.DB.prepare(
    'SELECT r2_key FROM apps WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ r2_key: string }>();

  if (!app) {
    return c.text('Not Found', 404);
  }

  const object = await c.env.R2.get(app.r2_key);

  if (!object) {
    return c.text('Content Not Found', 404);
  }

  const html = await object.text();

  return c.html(html);
});

// 创建应用（需认证）
appsRouter.post('/', agentAuthMiddleware, async (c) => {
  const body = await c.req.json<CreateAppRequest>();
  const agentId = c.get('agentId');

  const id = crypto.randomUUID();
  const now = Date.now();
  const r2Key = `apps/${agentId}/${id}.html`;

  // 上传 HTML 到 R2
  await c.env.R2.put(r2Key, body.html, {
    httpMetadata: { contentType: 'text/html' },
  });

  // 保存到数据库
  await c.env.DB.prepare(`
    INSERT INTO apps (id, agent_id, title, description, r2_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, agentId, body.title, body.description || null, r2Key, now, now).run();

  const app = await c.env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first<DbApp>();

  return c.json<ApiResponse<App>>({ success: true, data: dbAppToApp(app!) }, 201);
});

// 更新应用（需认证）
appsRouter.put('/:id', agentAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<CreateAppRequest>();
  const agentId = c.get('agentId');

  const existing = await c.env.DB.prepare(
    'SELECT agent_id, r2_key FROM apps WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ agent_id: string; r2_key: string }>();

  if (!existing) {
    return c.json<ApiResponse<null>>({ success: false, error: 'App not found' }, 404);
  }

  if (existing.agent_id !== agentId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }

  // 更新 R2 中的 HTML
  await c.env.R2.put(existing.r2_key, body.html, {
    httpMetadata: { contentType: 'text/html' },
  });

  // 更新数据库
  await c.env.DB.prepare(`
    UPDATE apps SET title = ?, description = ?, updated_at = ? WHERE id = ?
  `).bind(body.title, body.description || null, Date.now(), id).run();

  const app = await c.env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first<DbApp>();

  return c.json<ApiResponse<App>>({ success: true, data: dbAppToApp(app!) });
});

// 删除应用（需认证）
appsRouter.delete('/:id', agentAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const agentId = c.get('agentId');

  const existing = await c.env.DB.prepare(
    'SELECT agent_id, r2_key FROM apps WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ agent_id: string; r2_key: string }>();

  if (!existing) {
    return c.json<ApiResponse<null>>({ success: false, error: 'App not found' }, 404);
  }

  if (existing.agent_id !== agentId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }

  // 软删除（保留 R2 中的文件）
  await c.env.DB.prepare(
    'UPDATE apps SET deleted_at = ? WHERE id = ?'
  ).bind(Date.now(), id).run();

  return c.json<ApiResponse<null>>({ success: true });
});
