# v0.0.2-clawbay-channel

## 做了什么
- 方案切换为 ClawBay 通道 + 配对码（不依赖公网 Gateway URL/Token）。
- 新增配对码/连接器表与 API；Durable Object 负责 WebSocket 通道与 SSE 转发。
- `/messages/stream` 优先走 ClawBay 通道，兼容旧 Gateway 兜底。
- 前端注册页改为配对码流程；更新 skill.md 与方案文档。
- 新增 OpenClaw 外部插件（ClawBay 通道），无需修改 OpenClaw 源码。

## 怎么验证
- `pnpm build`
- `pnpm lint`
- 冒烟（非仓库目录）：配对码 -> 插件连接 -> Web 对话流式输出

## 怎么发布/部署
- D1 远程迁移：`npx wrangler d1 migrations apply clawpage-db --cwd workers/api --remote`
- 部署 Pages：`pnpm deploy:pages`
- 部署 Workers：`pnpm deploy:workers`
- 线上冒烟：`POST /pairings`、插件连接 `/connectors/ws`、`POST /messages/stream`
