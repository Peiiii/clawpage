# v0.0.34-chat-run-timeline

## 做了什么

- 在 `POST /chat` 的 UI Message Stream 中新增 `data-run_event` 数据事件，输出执行阶段：`queued`、`dispatching`、`streaming`、`completed`、`failed`。
- 在 `ChatPanel` 增加“执行进度”时间线面板，实时展示当前 Run 的阶段、文案与时间戳。
- 顶部状态行同步展示最新执行阶段，用户可以直接看到“当前正在做什么”。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && node -e "const fs=require('fs'); const chat=fs.readFileSync('/Users/peiwang/Projects/clawpage/workers/api/src/routes/chat.ts','utf8'); const panel=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/components/ChatPanel.tsx','utf8'); if(!chat.includes('data-run_event')||!chat.includes('writeRunEvent')){console.error('smoke-failed:chat'); process.exit(1);} if(!panel.includes('执行进度')||!panel.includes('data-run_event')){console.error('smoke-failed:panel'); process.exit(1);} console.log('smoke-ok');"`

验收点：

- 后端流式输出包含 `data-run_event`。
- 前端聊天面板出现“执行进度”区块，并可消费 `data-run_event` 事件。

## 产品验证链路

- 步骤 1：用户打开 Agent 页面并进入聊天面板（`/a/:slug` -> `Enter Terminal`）
  - 观察点：聊天头部显示在线状态，进度区块显示“发送消息后，这里会显示执行时间线”。
- 步骤 2：用户发送一条消息
  - 观察点：进度区块按顺序出现 `queued -> dispatching -> streaming`，并显示时间戳。
- 步骤 3：Agent 返回完成回复
  - 观察点：文本消息完整展示，进度区块出现 `completed`，头部状态同步为“最新阶段文案”。
- 步骤 4：异常链路（可选）
  - 观察点：当连接器异常时，进度区块出现 `failed`，并展示错误 detail。

## 怎么发布/部署

- API Worker 发布：`pnpm deploy:workers`
  - 发布结果：`clawpage-api`
  - Version ID：`a13faf2a-f683-4d7a-b19a-2b0960f4b5b4`
- Pages 发布：`pnpm deploy:pages`
  - 预览地址：`https://39e6d063.clawpage.pages.dev`

线上冒烟（非仓库目录执行）：

- `cd /tmp && curl -sSf https://api.clawbay.ai/health`
- `cd /tmp && curl -sSf https://clawbay.ai | head -n 5`
- `cd /tmp && html=$(curl -sSf https://clawbay.ai); asset=$(printf "%s" "$html" | sed -n 's#.*src="\(/assets/index-[^"]*\.js\)".*#\1#p' | head -n1); curl -sSf "https://clawbay.ai$asset" | rg -n "执行进度|data-run_event" >/dev/null && echo "smoke-ok:$asset"`

## 影响范围 / 风险

- Breaking change：否（新增事件，不破坏既有 `delta/final/error`）。
- 风险：若前端未消费 `data-run_event`，仅表现为不显示时间线，不影响原有聊天文本流。
