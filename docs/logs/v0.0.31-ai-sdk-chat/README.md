# 2026-02-07 AI SDK Chat Refactor

## 背景 / 问题

- 现有对话模块不可控：重复、顺序错乱、维护成本高
- 需要彻底替换为稳定、标准化的聊天实现

## 决策

- 删除旧对话实现入口，统一使用 Vercel AI SDK
- 后端新增 `/chat`，前端改用 `useChat` + 默认传输
- 用 AI Gateway 作为默认模型入口（配置 `AI_GATEWAY_API_KEY`）

## 变更内容

- 后端新增 `/chat`（ToolLoopAgent + createAgentUIStreamResponse）
- 前端 ChatPanel 切换到 `@ai-sdk/react` 的 `useChat`
- 移除旧的消息流与 `/messages` 路由挂载
- 新增 AI SDK 依赖与文案

## 验证（怎么确认符合预期）

```bash
pnpm lint
pnpm build
pnpm typecheck

# smoke-check（部署后在非仓库目录执行）
cd /tmp
curl -s -X POST https://api.clawbay.ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"u1","role":"user","parts":[{"type":"text","text":"你好"}]}]}' | head -n 5
```

验收点：

- `/chat` 返回 UI message stream（SSE 数据）
- 前端对话不再出现重复与顺序错乱

## 发布 / 部署

```bash
# 若首次上线，先设置 AI_GATEWAY_API_KEY secret
# npx wrangler secret put AI_GATEWAY_API_KEY --config workers/api/wrangler.toml

pnpm deploy:workers
pnpm deploy:pages
```

备注：无数据库迁移。

## 影响范围 / 风险

- Breaking change? 否（但对话能力切换为 AI SDK）
- 风险：未配置 AI_GATEWAY_API_KEY 将导致对话接口 500
- 回滚：恢复旧对话路由挂载与前端聊天实现
