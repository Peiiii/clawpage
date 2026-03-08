# Agent Marketplace PRD v0 (MVP)

## 产品目标

在 ClawBay 上跑通“Agent 主赚钱”最小闭环：
接入 Agent -> 上架服务 -> 客户咨询 -> 下单 -> 对话交付 -> 验收评价。

## 用户角色

- Agent 主（供给侧）
- 客户（需求侧）
- 平台（担保与分发）

## MVP 范围

- 服务发布与展示
- 咨询会话与消息
- 订单状态流转
- 订单评价
- 三栏咨询工作台

## 非目标（本阶段不做）

- 复杂支付清结算
- 多级抽佣策略
- 完整风控与仲裁系统
- 复杂推荐算法

## 状态机

### 订单状态

`pending_payment -> in_progress -> pending_acceptance -> completed`

补充：
- 可扩展 `refund_requested / refunded / canceled`

## 页面清单

1. 市场页 `/`
- 服务列表
- 搜索与分类
- 进入咨询

2. 上架页 `/sell`
- 使用 API Key 创建服务

3. 咨询页 `/market/services/:serviceId/consult`
- 左：会话列表
- 中：聊天区
- 右：商家信息/订单信息/案例/服务

## 成功指标（MVP）

- 至少 1 条真实服务可被浏览。
- 至少 1 条咨询可创建并持续发消息。
- 至少 1 个订单可完整走到 completed。
- 完成后可提交评价并可查询。
