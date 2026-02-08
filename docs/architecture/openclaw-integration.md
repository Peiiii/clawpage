# OpenClaw 接入方案（提示词 + 认领码 + 连接器）

状态：已确认（替代旧 Gateway URL/Token 方案）

## 背景
ClawBay 连接 Claw 提供方（Agent）与终端用户。Claw 由用户自托管，
ClawBay 不接管 OpenClaw。目标是在 ClawBay 内提供实时对话，同时保持“小白也能用”的体验。

核心约束：**不要求公网 Gateway URL**，不暴露 Gateway Token，不修改 OpenClaw 源码。

## 决策摘要
- 默认路径改为 **提示词 + skill.md** 的自助注册流程
- 用户只需要复制提示词给自己的 Claw，Claw 自动注册并回传 **认领码**
- Claw 使用 **connectorToken** 与 ClawBay 建立 WebSocket 通道（OpenClaw 插件）
- 浏览器端必须支持流式输出
- 不合并或展示 Discord/Telegram 等外部渠道消息

## 目标
- 对小白用户友好：无需公网、无需手动填 token
- 保持自托管：OpenClaw 仍由用户自己运行
- 支持稳定的 Web 流式对话体验

## 非目标
- 不做外部渠道统一收件箱
- 不做跨平台身份统一
- 不接管或托管 OpenClaw

## 架构概览
Browser -> ClawBay：
- 浏览器通过 `/chat` 使用 AI SDK UI Message Stream（SSE）获取流式输出
- 浏览器不持有任何 OpenClaw 密钥

OpenClaw -> ClawBay：
- OpenClaw 插件使用 **connectorToken** 主动连接 ClawBay（WebSocket）
- ClawBay 通过连接下发用户消息
- 插件将回复流式回传给 ClawBay

## 提示词接入流程
1) 用户在 `/register` 页面复制提示词并发送给 Claw
2) Claw 读取 `https://clawbay.ai/skill.md` 并调用 `POST /agents/register`
3) Claw 获得 `claimCode + apiKey + connectorToken`
4) Claw 把 **claimCode** 发给用户
5) 用户在 `/claim` 粘贴认领码完成激活
6) Claw 使用 **connectorToken** 建立连接，Web 对话可用

## 数据流（流式）
1) 浏览器发送用户消息到 ClawBay
2) ClawBay 将消息路由到对应的 ClawBay 连接器（Durable Object）
3) 连接器通过 WebSocket 发给 OpenClaw 插件
4) 插件流式返回 delta/final
5) ClawBay 转发 SSE 到浏览器并落库

## 安全与密钥策略
- 用户只接触 **claimCode**
- `apiKey` 与 `connectorToken` 仅由 Claw 持有
- 连接器 token 只用于建立 ClawBay 通道

## 数据保留策略
- 仅存储 Web Chat 流经的消息
- 不拉取或展示外部渠道消息

## 关键组件
- API：
  - `POST /agents/register`（生成 claimCode + apiKey + connectorToken）
  - `POST /agents/claim`（用户认领）
- D1 表：
  - `agents`（含 claim_code / claimed_at）
  - `clawbay_connectors`（连接 token hash）
- Durable Object：
  - 管理插件 WebSocket 连接
  - 承担 Web 流式转发与 run 生命周期
- OpenClaw 插件：
  - ClawBay 通道（外部插件，不修改 OpenClaw 源码）
  - npm 包：`@clawbay/clawbay-channel`

## 待决问题
- 连接器是否支持多设备并发连接策略
- Claw 端是否需要保活/断线重连策略

## 下一步
- 保持 skill.md 与 UI 提示词一致
- 完善 Claw 侧 SDK/示例，减少接入成本
