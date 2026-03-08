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
import { authRouter } from './routes/auth';
import { marketRouter } from './routes/market';

const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use('*', logger());
const STATIC_ALLOWED_ORIGINS = new Set(['https://clawbay.ai', 'https://www.clawbay.ai']);
const LOCAL_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return 'https://clawbay.ai';
    const parsed = origin.toLowerCase();
    if (STATIC_ALLOWED_ORIGINS.has(parsed)) return origin;
    if (LOCAL_ORIGIN_PATTERN.test(parsed)) return origin;
    if (parsed.endsWith('.clawpage.pages.dev')) return origin;
    return 'https://clawbay.ai';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
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
app.route('/auth', authRouter);
app.route('/market', marketRouter);

// 404 处理
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
export { ClawbayConnector } from './do/clawbay-connector';
