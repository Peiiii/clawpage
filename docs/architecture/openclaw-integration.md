# OpenClaw 接入方案（Phase A）

状态：已讨论并确认

## 背景

ClawBay 是连接 Claw 提供方（Agent）与终端用户的平台。提供方自托管 OpenClaw，
ClawBay 不负责运行或管理 OpenClaw Gateway。目标是在 ClawBay 内提供实时对话，
默认不合并外部渠道流量。

## 决策摘要

Phase A 为默认路径：
- ClawBay 提供 Web 对话 UI 与目录能力。
- 不合并或展示 Discord、Telegram、Slack、WhatsApp 等外部渠道消息。
- ClawBay 通过提供方的 OpenClaw Gateway 实现对话与流式输出。
- 浏览器端必须支持流式输出。

Phase B/Phase C 为可选后续：
- Phase B：仅同步摘要或通知类事件。
- Phase C：全量合并外部渠道消息流。

## 目标

- 提供稳定、可流式输出的 Web 对话体验。
- 尊重自托管边界（不强制数据出站）。
- 初期接入保持简单、安全。

## 非目标（Phase A）

- 不做外部渠道统一收件箱。
- 不做跨平台身份统一。
- 不为用户自动接管或托管 Gateway。

## 架构（Phase A）

Browser -> ClawBay：
- 浏览器通过 WebSocket 或 SSE 连接 ClawBay API 获取流式输出。
- 浏览器不持有 Gateway 密钥。

ClawBay -> Gateway：
- ClawBay 代用户/Agent 维护 Gateway WS 连接。
- 转发 chat.history / chat.send 等请求。
- 将 Gateway 的流式事件转发给浏览器。

数据流：
1) 浏览器发送用户消息到 ClawBay。
2) ClawBay 将 user 与 agent 映射到 Gateway sessionKey。
3) ClawBay 调用 Gateway chat.send（包含幂等 key）。
4) Gateway 推送 chat 事件（delta/final）。
5) ClawBay 转发事件给浏览器，并按需落库。

## 会话映射

ClawBay 维护稳定映射：
- (userId, agentId) -> sessionKey

sessionKey 用于：
- chat.history
- chat.send
- chat.abort

存储策略：
- 映射关系持久化到 DB。
- 热会话映射可做内存缓存以降低延迟。

## 流式输出要求

ClawBay 需要将 Gateway 的 chat 事件转发到浏览器：
- state = delta：追加到当前 assistant 气泡。
- state = final：收束消息并结束流。
- state = error/aborted：UI 展示终态。

## Gateway 鉴权与配对

非本地连接需要鉴权与设备身份：
- 方案一：设备身份握手 + 持久化 device keypair + 提供方配对批准。
- 方案二：提供方显式开启 token-only 旁路（安全降级，需明确 opt-in）。

ClawBay 必须安全存储 Gateway auth 信息，并且不下发到浏览器。

## 数据保留策略

Phase A 默认：
- 仅存储 Web Chat 路径流经的消息。
- 不拉取或展示外部渠道消息。

## Phase B（可选）：摘要与通知

如有需要，增加最小同步：
- 仅存事件元信息（时间、渠道、短摘要）。
- 默认不存完整消息体。
- 对每个提供方提供显式开关。

## Phase C（可选）：全量合并

仅在以下条件满足后考虑：
- 需求验证充分。
- 法务与隐私路径清晰。
- 自托管场景下 Gateway 回流稳定。
- 完成跨渠道身份映射方案。

## 待决问题

- 浏览器侧优先用 WS 还是 SSE？
- Gateway 设备身份 keypair 存放位置？
- ClawBay 是否需要持久化完整对话，还是依赖 Gateway history？

## 下一步

- 定义 Gateway 连接模型（字段与存储）。
- 在 ClawBay API 增加 Gateway 代理服务。
- 前端从轮询改为流式传输。
