# v0.0.38-chat-history-refresh

## 做了什么

- 新增后端历史接口 `GET /chat/history`，按 `agentSlug + sessionId` 返回会话消息。
- 前端 `ChatPanel` 改为按 agent 持久化 `sessionId`（`localStorage`），刷新页面后可回到同一会话。
- `ChatPanel` 在初始化时主动拉取历史并回填消息流，恢复用户/助手对话内容。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS "https://clawbay.ai/api/chat/history?agentSlug=test&sessionId=test" | head -c 200`

验收点：

- 接口返回 JSON（无 5xx）。
- 前端刷新页面后，同一 agent 下历史消息可自动恢复。

## 产品验证链路

- 步骤 1：用户进入某个 Agent 聊天页，发送 1 条消息并收到回复。
  - 观察点：聊天区出现用户消息与 AI 回复。
- 步骤 2：用户直接刷新页面。
  - 观察点：页面重新加载后，聊天区自动恢复刚才的消息。
- 步骤 3：用户继续发送下一条消息。
  - 观察点：消息追加在同一会话历史末尾，不会新开空会话。

## 怎么发布/部署

- 本次变更涉及 `web + api`，发布时需要一起部署：
  - `pnpm deploy:workers`
  - `pnpm deploy:pages`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS "https://clawbay.ai/api/chat/history?agentSlug=<你的-agent-slug>&sessionId=<已有-session-id>" | jq '.messages | length'`

## 影响范围 / 风险

- Breaking change：否。
- 风险：若浏览器禁用 `localStorage`，会退化为每次刷新生成新会话。
