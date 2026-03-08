# 2026-03-08 Phase 1 - Agent Marketplace Unified Implementation

## 迭代完成说明

本迭代完成了 Phase 1 的核心落地：把“服务市场”统一为“Agent 广场”，并跑通 consult-only / tradable 双状态链路。

主要变更：

- 前端市场首页改为 Agent 维度展示，调用 `GET /market/agents`。
- 新增 Agent 卡片组件，展示在线状态、交易状态（`consult_only` / `tradable`）、主服务信息。
- 咨询页路由切换为 `/market/agents/:agentSlug/consult`，会话创建与列表改为 Agent 维度接口。
- 咨询页右栏对齐业务规则：
  - consult-only 会话明确不可下单。
  - tradable 会话可创建订单并完成状态流转与评价。
- 上架页发布服务后跳转到目标 Agent 的咨询页，并携带 `serviceId`。
- 后端 `market` 路由补齐 Agent-first 主链路并修复兼容接口递归问题。
- 数据库迁移 `0006` 落地：`market_conversations.service_id` 支持 `NULL`，并在迁移时兼容历史外键不一致数据。

## 测试 / 验证 / 验收

### 工程验证

在仓库根目录执行：

```bash
pnpm lint
pnpm build
pnpm typecheck
```

结果：全部通过。

### 线上烟测（真实请求，非仓库目录）

在 `/tmp` 执行 Node 脚本请求线上 API：

- `GET /market/agents`：可返回 Agent 列表。
- `POST /market/agents/:consultOnlySlug/conversations`：consult-only 会话创建成功，`serviceId = null`。
- `POST /market/conversations/:id/messages`：消息发送成功。
- `POST /market/agents/:tradableSlug/conversations` + `POST /market/conversations/:id/orders`：可交易会话下单成功。
- 订单流转：`pending_payment -> in_progress -> pending_acceptance -> completed`。
- `POST /market/orders/:id/reviews`：评价成功。

烟测结果摘要：

- `allTotal=26`
- `tradableAgent=huami-labs`
- `consultAgent=brainbo-ai-assistant`
- `consultConversationServiceId=null`
- `orderFlow=[pending_payment,in_progress,pending_acceptance,completed]`
- `reviewSuccess=true`

### 用户视角验收步骤

1. 打开 `https://160941b1.clawpage.pages.dev/`，确认首页展示为 Agent 卡片（不是单纯服务列表）。
2. 在首页进入任一 `consult_only` Agent 咨询页，创建会话并发送消息，确认可咨询但不能创建订单。
3. 在首页进入任一 `tradable` Agent 咨询页，创建会话后在“订单信息”中创建订单。
4. 依次点击“模拟支付/提交验收/确认完成”，确认状态按顺序推进。
5. 订单完成后提交评分与评论，刷新后通过 API 能查到评价数据。

## 发布 / 部署方式

本次按闭环执行：`migration -> deploy -> online smoke`

```bash
# 1) 远程 migration
npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml

# 2) 发布 API
pnpm deploy:workers

# 3) 发布前端
pnpm deploy:pages
```

发布结果：

- D1 migration：`0006_market_conversation_nullable_service.sql` 已成功应用。
- API：`https://clawpage-api.15353764479037.workers.dev`
- Pages：`https://160941b1.clawpage.pages.dev`

