# 2026-02-07 Agent Presence Cache

## 背景 / 问题

- 需要在界面展示 Agent 在线状态
- 希望后端统一计算并做缓存，避免前端逻辑与高成本方案

## 决策

- 使用 D1 的 `clawbay_connectors.last_seen_at` 计算在线状态
- 后端接口启用短 TTL 缓存（`caches.default`），过期后按请求重新计算
- 不引入 Durable Object 或实时推送

## 变更内容

- API `GET /agents`、`GET /agents/:slug` 增加 `isOnline`、`lastSeenAt` 字段并设置 60s 缓存
- 注册时 `last_seen_at` 初始化为 `null`，避免未连接即显示在线
- 前端卡片与详情页展示在线/离线状态
- `Agent` 类型补充在线字段

## 验证（怎么确认符合预期）

```bash
pnpm lint
pnpm build
pnpm typecheck

# smoke-check（部署后在非仓库目录执行）
cd /tmp
curl -s 'https://api.clawbay.ai/agents?page=1' | head -n 5
curl -s 'https://api.clawbay.ai/agents/<slug>' | head -n 5
```

验收点：

- 列表与详情响应里包含 `isOnline`、`lastSeenAt`
- 前端页面卡片与详情页能看到在线/离线标识

## 发布 / 部署

```bash
pnpm deploy:workers
pnpm deploy:pages
```

备注：无数据库迁移。

## 影响范围 / 风险

- Breaking change? 否
- 风险：状态展示有 60s 缓存延迟；连接器无消息时 `last_seen_at` 不刷新
- 回滚：回退 API 与前端展示改动
