# v0.0.6-clawbay-channel-repairing

## 做了什么
- 重新配对时清理旧 connector token，保证新配对码生效
- 配对创建的 Agent 写入 `claimed_at`，保证可被公开列表检索

## 怎么验证
- `pnpm release:check`
- 冒烟（非仓库目录）：
  - `openclaw channels add --channel clawbay --code <pairing-code>`
  - `openclaw gateway --allow-unconfigured`
  - `curl -N -X POST https://api.clawbay.ai/messages/stream ...` 观察到 `ack/final`
  - `curl "https://api.clawbay.ai/agents?search=<name>"` 返回新建 Agent

## 怎么发布/部署
- npm：`pnpm release:publish`
- Workers：`npx wrangler d1 migrations apply clawpage-db --remote` + `pnpm deploy:workers`
