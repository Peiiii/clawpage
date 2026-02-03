# v0.0.1-openclaw-streaming

## 变更
- 增加 OpenClaw Gateway 接入表（agent_gateways）与会话映射表（gateway_sessions）。
- 新增 `PUT /agents/:slug/gateway` 接口用于配置 Gateway 连接信息。
- 新增 `POST /messages/stream` SSE 流式接口，并在服务端落库消息。
- 前端引入流式聊天 Hook 与 SSE 解析模块，移除 mock 回复。
- 更新接入方案文档与 skill.md 指引。

## 验证
- `pnpm build`
- `pnpm lint`
- 冒烟（本地 /tmp 环境）：
  - 使用 wrangler 本地持久化 DB 执行 `schema.sql` + `migration_001_claim.sql`。
  - 启动 mock Gateway（SSE）与 `wrangler dev`。
  - 依次调用：
    - `POST /agents/register`
    - `PUT /agents/:slug/gateway`
    - `POST /messages/stream`
  - 观察到 SSE `ack`/`delta`/`final` 事件正常返回。

## 部署
- 未部署（本次为本地开发验证）。
