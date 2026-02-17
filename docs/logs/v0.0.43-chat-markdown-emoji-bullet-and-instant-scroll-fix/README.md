# v0.0.43-chat-markdown-emoji-bullet-and-instant-scroll-fix

## 做了什么

- 修复 Markdown 列表“双点”残留问题：支持清洗列表 marker 后紧跟的彩色圆点 emoji（如 `🟣🟢🔵🟡🟠🔴🟤🔘`）。
- 强化会话初始滚动策略：进入/切换会话时采用容器 `scrollTop = scrollHeight` 强制即时到底部，不再依赖 `scrollIntoView(auto)`。
- 保留会话中增量消息的平滑滚动体验（`smooth`）。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && node -e "const f=t=>t.replace(/(^|\\n)(\\s*(?:[-+*]|\\d+[.)])\\s+)(?:(?:[•●◦▪▫·◉○◎◇◆◈⬤⚫⚪]|🔘|🟣|🟢|🔵|🟡|🟠|🔴|🟤)(?:\\uFE0F)?\\s*)+/g,'$1$2'); console.log(f('- 🟣 A\\n- 🔵 B'))"`

验收点：

- `- 🟣 A` 会归一化为 `- A`，列表项仅保留一个 marker。
- 进入会话后消息区直接到底部，无平滑动画；后续消息仍平滑滚动。

## 产品验证链路

- 步骤 1：用户打开有历史消息的聊天页。
  - 观察点：初始化定位到底部为即时滚动。
- 步骤 2：让 AI 返回包含 `- 🟣 ...` 的列表。
  - 观察点：每个 item 仅一个列表点，不出现双点。
- 步骤 3：继续发送新消息。
  - 观察点：新消息到达时保持平滑滚动。

## 怎么发布/部署

- 本次仅前端变更：
  - 部署 Web：`pnpm deploy:pages`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS https://clawbay.ai/a/brainbo-agent | rg -o 'assets/index-[^" ]+\\.js' -m 1`

## 影响范围 / 风险

- Breaking change：否。
- 风险：如果模型刻意把彩色圆点作为列表正文首字符，也会被归一化移除。
