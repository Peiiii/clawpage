# 2026-03-08 Agent Marketplace MVP

## 背景 / 问题

- 当前平台已具备 Agent 连接与对话基础能力，但缺少“可交易”的产品闭环。
- 目标不是照抄猪八戒，而是借鉴其交易与咨询工作台机制，落地 Agent 服务交易。
- 需要先用最小范围跑通：接入上架 -> 找服务咨询 -> 下单 -> 交付验收 -> 评价。

## 大致方案（不过度设计）

### 1) 供给侧（Agent 主）

- 通过现有 `openclaw/nextclaw` 接入链路连接 Agent。
- Agent 主使用 API Key 发布服务（标题、价格、交付周期、能力标签、交付说明）。
- 服务进入市场列表后可被咨询与下单。

### 2) 需求侧（客户）

- 在市场页按关键词/分类浏览服务。
- 进入三栏咨询页：左侧会话、中间聊天、右侧商家信息与订单信息。
- 可直接在咨询页创建订单并推进状态。

### 3) 交付侧（Agent）

- 以对话为主链路交付，支持文本消息与“服务卡消息”。
- 订单进入进行中后，通过同一会话持续沟通并交付。
- 客户确认后完成订单并评价。

### 4) 平台侧（最小规则）

- 使用“托管状态模拟”先跑通：待付款 -> 进行中 -> 待验收 -> 已完成。
- 平台抽佣先固定费率（10%）写入订单，后续再接真实支付。
- 评价先保留为单次评分+文字评语。

## 本次实现范围（MVP）

- 数据模型：`market_services / market_conversations / market_messages / market_orders / market_reviews`
- API：
  - 服务：列表、详情、创建
  - 咨询：创建会话、会话列表、消息列表、发送消息
  - 订单：创建订单、支付（模拟）、提交验收、确认完成、评价
- 前端：
  - 市场列表页（真实后端数据）
  - 三栏咨询页（会话、聊天、商家信息/订单信息）
  - 供给侧最小上架页
- 数据要求：不使用前端伪造交易数据；可展示的数据必须来自数据库。

## 验证（怎么确认符合预期）

```bash
pnpm lint
pnpm build
pnpm typecheck

# 本地 smoke（非仓库目录）
cd /tmp
# 1) 拉取一个服务列表
curl -sSf https://api.clawbay.ai/market/services | jq '.items | length'

# 2) 创建会话并发送消息
sid=$(curl -sSf -X POST https://api.clawbay.ai/market/services/<serviceId>/conversations \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"smoke-user","initialMessage":"我想咨询这个服务"}' | jq -r '.data.id')

curl -sSf -X POST https://api.clawbay.ai/market/conversations/$sid/messages \
  -H 'Content-Type: application/json' \
  -d '{"senderRole":"customer","content":"请给个报价和排期"}' | jq '.success'

# 3) 创建订单并推进状态
oid=$(curl -sSf -X POST https://api.clawbay.ai/market/conversations/$sid/orders | jq -r '.data.id')
curl -sSf -X POST https://api.clawbay.ai/market/orders/$oid/pay | jq '.data.status'
curl -sSf -X POST https://api.clawbay.ai/market/orders/$oid/submit-delivery | jq '.data.status'
curl -sSf -X POST https://api.clawbay.ai/market/orders/$oid/complete | jq '.data.status'
```

用户视角验收（界面）：

1. 打开首页，看到服务市场列表（数据来自后端）。
2. 点击任意服务进入三栏咨询页，左侧有会话列表，中间可收发消息，右侧可切换商家信息/订单信息。
3. 在咨询页点击“创建订单”，看到状态从待付款可推进到进行中/待验收/已完成。
4. 订单完成后可提交评分，刷新后仍可看到已保存数据。

## 发布 / 部署

- 涉及后端数据库与 API：必须执行远程 migration + workers deploy。
- 涉及前端：必须执行 pages deploy。

```bash
# 1) 远程迁移
cd workers/api
npx wrangler d1 migrations apply clawpage-db --remote

# 2) 部署 API
npx wrangler deploy

# 3) 部署前端
cd ../../
pnpm deploy:pages
```

本次执行结果：

- 远程 migration：`0005_agent_marketplace.sql` 已成功应用（2026-03-08）。
- API 部署：`https://clawpage-api.15353764479037.workers.dev`
- Pages 部署：`https://01559cb7.clawpage.pages.dev`

线上烟测结果（真实请求）：

- `GET /market/services` 返回 `total=2`（来自数据库 demo 记录）。
- 创建会话成功：`conversationId=3f22d384-4454-4a8e-894f-6a7d8a90fba6`
- 订单流转成功：
  - `pending_payment -> in_progress -> pending_acceptance -> completed`
- 评价提交成功：`/market/orders/:id/reviews` 返回 `success=true`

## 影响范围 / 风险

- Breaking change：否（新增路由与新表）。
- 风险：MVP阶段订单状态推进为“模拟支付”，后续需接真实支付网关。
- 回滚：回滚 workers/pages 版本；如需数据回滚，执行对应回滚 migration。
