# OpenClaw 接入方案（ClawBay 通道 + 配对码）

状态：已讨论并确认（替代旧 Gateway URL/Token 方案）

## 背景

ClawBay 是连接 Claw 提供方（Agent）与终端用户的平台。提供方自托管 OpenClaw，
ClawBay 不接管 OpenClaw。目标是在 ClawBay 内提供实时对话，同时保持“小白也能用”的体验。

核心约束：**不要求公网 Gateway URL**，不暴露 Gateway Token。

## 决策摘要

默认路径改为：
- ClawBay 提供 Web 对话 UI 与目录能力。
- 不合并或展示 Discord/Telegram/Slack/WhatsApp 等外部渠道消息。
- 通过 **OpenClaw 插件（ClawBay 通道）**与 ClawBay 建立“向外连接”的通道。
- 浏览器端必须支持流式输出。

## 目标

- 对小白用户友好：无需公网、无需手动填 token。
- 保持自托管：OpenClaw 仍由用户自己运行。
- 支持稳定的 Web 流式对话体验。

## 非目标

- 不做外部渠道统一收件箱。
- 不做跨平台身份统一。
- 不接管或托管 OpenClaw。

## 架构概览

Browser -> ClawBay：
- 浏览器通过 SSE 获取流式输出。
- 浏览器不持有任何 OpenClaw 密钥。

OpenClaw -> ClawBay：
- OpenClaw 插件主动连接 ClawBay（WebSocket）。
- ClawBay 通过连接下发用户消息。
- 插件将回复流式回传给 ClawBay。

## 配对流程（小白体验）

1) 用户在 ClawBay 生成配对码（只需填写 Claw 名称/slug）。
2) 用户安装 ClawBay 通道插件（npm）并粘贴配对码。
3) 插件向 ClawBay 交换长期连接凭据并建立通道。
4) ClawBay 生成 Agent 条目，网页即可直接聊天。

## 数据流（流式）

1) 浏览器发送用户消息到 ClawBay。
2) ClawBay 将消息路由到对应的 ClawBay 通道（Durable Object）。
3) 通道通过 WebSocket 发给 OpenClaw 插件。
4) 插件流式返回 delta/final。
5) ClawBay 转发 SSE 到浏览器并落库。

## 安全与密钥策略

- 用户不需要知道 Gateway URL 或 Token。
- 插件使用 **配对码**换取**连接令牌**（仅插件持有）。
- 连接令牌仅用于建立 ClawBay 通道，不下发到浏览器。

## 数据保留策略

- 仅存储 Web Chat 流经的消息。
- 不拉取或展示外部渠道消息。

## 关键组件

- D1 表：
  - `clawbay_pairings`：配对码与状态
  - `clawbay_connectors`：连接器与令牌哈希
- Durable Object：
  - 管理插件 WebSocket 连接
  - 承担 Web 流式转发与 run 生命周期
- OpenClaw 插件：
  - ClawBay 通道（外部插件，不修改 OpenClaw 源码）
  - npm 包：`@clawbay/clawbay-channel`

## 待决问题

- 插件首次绑定时是否要求填写 agent 名称/slug（或使用 ClawBay 侧表单）？
- 是否需要多设备同时在线的连接策略？

## 下一步

- 实现配对码 API 与通道 DO。
- 实现 OpenClaw ClawBay 通道插件（外部插件）。
- 前端加入配对码生成与安装指引。
