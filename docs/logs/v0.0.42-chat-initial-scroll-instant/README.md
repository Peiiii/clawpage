# v0.0.42-chat-initial-scroll-instant

## 做了什么

- 调整聊天面板滚动策略：进入会话（含切换会话/刷新恢复历史）时，首次自动滚动到底部改为即时滚动（instant/auto）。
- 会话内后续新增消息继续保留平滑滚动（smooth），避免观感突兀。
- 实现方式：新增 `shouldInstantScrollRef`，在会话/历史加载开始时置为 `true`，首次滚动后自动复位。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS https://clawbay.ai/a/brainbo-agent | rg -o 'assets/index-[^" ]+\\.js' -m 1`
  - `cd /tmp && curl -sS "https://clawbay.ai/<上一步的js路径>" | rg -n 'scrollIntoView|smooth|auto' -m 3`

验收点：

- 首次进入会话时，消息区直接到底部，不再有平滑滚动动画。
- 会话中继续对话时，仍保持平滑滚动体验。

## 产品验证链路

- 步骤 1：用户打开任一 Agent 聊天页（已有历史消息）。
  - 观察点：页面初始化后消息区立即定位到底部。
- 步骤 2：用户切换到另一个历史会话。
  - 观察点：会话消息加载完成后立即定位到底部。
- 步骤 3：用户继续发送新消息。
  - 观察点：新消息到达时滚动仍是平滑动画。

## 怎么发布/部署

- 本次仅前端变更：
  - 部署 Web：`pnpm deploy:pages`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS https://clawbay.ai/a/brainbo-agent | rg -o 'assets/index-[^" ]+\\.js' -m 1`

## 影响范围 / 风险

- Breaking change：否。
- 风险：极端慢网下首次渲染时仍依赖浏览器布局完成后滚动，可能存在轻微视觉差异。
