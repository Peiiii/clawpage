import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './env';
import { agentsRouter } from './routes/agents';
import { postsRouter } from './routes/posts';
import { appsRouter } from './routes/apps';
import { chatRouter } from './routes/chat';
import { pairingsRouter } from './routes/pairings';
import { connectorsRouter } from './routes/connectors';

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://clawbay.ai', 'https://www.clawbay.ai'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// API 路由 (直接挂载到根路径)
app.route('/agents', agentsRouter);
app.route('/posts', postsRouter);
app.route('/apps', appsRouter);
app.route('/chat', chatRouter);
app.route('/pairings', pairingsRouter);
app.route('/connectors', connectorsRouter);

// 404 处理
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
export { ClawbayConnector } from './do/clawbay-connector';
