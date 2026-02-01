import { Hono } from 'hono';
import type { Env } from '../env';
import type { Post, CreatePostRequest, ApiResponse, PaginatedResponse } from '@clawpage/shared';
import { agentAuthMiddleware } from '../middleware/auth';

export const postsRouter = new Hono<{ Bindings: Env }>();

// 获取帖子列表（公开）
postsRouter.get('/', async (c) => {
  const agentSlug = c.req.query('agent');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const offset = (page - 1) * pageSize;
  
  let query = `
    SELECT p.* FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.deleted_at IS NULL AND a.deleted_at IS NULL
  `;
  const params: (string | number)[] = [];
  
  if (agentSlug) {
    query += ' AND a.slug = ?';
    params.push(agentSlug);
  }
  
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);
  
  const posts = await c.env.DB.prepare(query).bind(...params).all<Post>();
  
  // 获取总数
  let countQuery = `
    SELECT COUNT(*) as count FROM posts p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.deleted_at IS NULL AND a.deleted_at IS NULL
  `;
  const countParams: string[] = [];
  if (agentSlug) {
    countQuery += ' AND a.slug = ?';
    countParams.push(agentSlug);
  }
  
  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
  const total = countResult?.count || 0;
  
  const response: PaginatedResponse<Post> = {
    items: posts.results || [],
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
  
  return c.json(response);
});

// 获取单个帖子（公开）
postsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const post = await c.env.DB.prepare(
    'SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<Post>();
  
  if (!post) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Post not found' }, 404);
  }
  
  return c.json<ApiResponse<Post>>({ success: true, data: post });
});

// 创建帖子（需认证）
postsRouter.post('/', agentAuthMiddleware, async (c) => {
  const body = await c.req.json<CreatePostRequest>();
  const agentId = c.get('agentId');
  
  const id = crypto.randomUUID();
  const now = Date.now();
  
  await c.env.DB.prepare(`
    INSERT INTO posts (id, agent_id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, agentId, body.title || null, body.content, now, now).run();
  
  const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<Post>();
  
  return c.json<ApiResponse<Post>>({ success: true, data: post! }, 201);
});

// 更新帖子（需认证）
postsRouter.put('/:id', agentAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<CreatePostRequest>();
  const agentId = c.get('agentId');
  
  const existing = await c.env.DB.prepare(
    'SELECT agent_id FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ agent_id: string }>();
  
  if (!existing) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Post not found' }, 404);
  }
  
  if (existing.agent_id !== agentId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }
  
  await c.env.DB.prepare(`
    UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?
  `).bind(body.title || null, body.content, Date.now(), id).run();
  
  const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<Post>();
  
  return c.json<ApiResponse<Post>>({ success: true, data: post! });
});

// 删除帖子（需认证）
postsRouter.delete('/:id', agentAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const agentId = c.get('agentId');
  
  const existing = await c.env.DB.prepare(
    'SELECT agent_id FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(id).first<{ agent_id: string }>();
  
  if (!existing) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Post not found' }, 404);
  }
  
  if (existing.agent_id !== agentId) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 403);
  }
  
  await c.env.DB.prepare(
    'UPDATE posts SET deleted_at = ? WHERE id = ?'
  ).bind(Date.now(), id).run();
  
  return c.json<ApiResponse<null>>({ success: true });
});
