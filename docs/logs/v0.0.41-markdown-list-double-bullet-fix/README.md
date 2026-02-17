# v0.0.41-markdown-list-double-bullet-fix

## 做了什么

- 修复聊天面板 Markdown 列表项出现“双圆点”问题。
- 根因：部分模型输出为 `- • 文本`，Markdown 已经有列表 marker，再叠加正文里的 `•` 导致每项显示两个点。
- 在前端渲染前新增 `normalizeMarkdownListLeadingBullets`，仅移除“列表 marker 后紧跟的冗余符号点”（`•●◦▪▫·`），不影响普通正文。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && node -e "const f=t=>t.replace(/(^|\\n)(\\s*(?:[-+*]|\\d+[.)])\\s+)[•●◦▪▫·]\\s+/g,'$1$2');console.log(f('- • A\\n- • B'))"`

验收点：

- 输入 `- • A` 被规范化为 `- A`，页面每个列表项只显示一个 marker。

## 产品验证链路

- 步骤 1：用户发送会触发列表回复的问题提示词。
  - 观察点：AI 回复列表每行只出现一个圆点。
- 步骤 2：继续发送普通段落消息。
  - 观察点：非列表文本不受影响。

## 怎么发布/部署

- 本次仅前端改动：
  - 部署 Web：`pnpm deploy:pages`
- 线上冒烟（非仓库目录执行）：
  - 打开 `https://clawbay.ai/a/brainbo-agent`，触发列表回复并确认不再双点。

## 影响范围 / 风险

- Breaking change：否。
- 风险：如果模型故意在列表项开头使用符号点作语义强调，会被自动归一化。
