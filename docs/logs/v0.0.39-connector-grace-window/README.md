# v0.0.39-connector-grace-window

## 做了什么

- 将 ClawBay Connector 的连接等待窗口从 `5s` 提升到 `20s`。
- 目标是减少短暂断连/重连期间，前端被快速判定为 `Connector offline` 的概率。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS -D - https://api.clawbay.ai/chat/history -o /tmp/v039-history.out && head -n 20 /tmp/v039-history.out`

验收点：

- API 服务可用，`/chat/history` 正常返回参数校验错误（`agentSlug required`），说明路由链路正常。
- 线上聊天在 connector 短暂重连时，明显减少 5 秒即失败的 `Connector offline`。

## 产品验证链路

- 步骤 1：用户在 Agent 页面发送消息。
  - 观察点：进度显示“消息已提交，等待 Claw 接收”。
- 步骤 2：Connector 出现短暂抖动并很快恢复。
  - 观察点：请求继续等待，不应在 5 秒左右立即失败。
- 步骤 3：Connector 恢复后继续对话。
  - 观察点：本条消息可继续返回回复，失败率降低。

## 怎么发布/部署

- 本次变更仅涉及后端 Worker：
  - 远程 migration：`pnpm --filter @clawpage/api exec wrangler d1 migrations apply clawpage-db --remote`
  - 部署：`pnpm deploy:workers`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS -o /tmp/v039-health.json -w '%{http_code}\n' https://api.clawbay.ai/health`

## 影响范围 / 风险

- Breaking change：否。
- 风险：在 connector 真离线时，单次请求最长会多等待约 20 秒才失败。
