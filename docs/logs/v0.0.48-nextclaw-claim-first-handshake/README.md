# v0.0.48-nextclaw-claim-first-handshake

## 做了什么

- 将 `nextclaw` 接入流程改为“先回认领码，再后台连接/重启”，避免 AI 因连接或重启中断当前回复。
- 重写 `apps/web/public/skill-nextclaw.md` 的关键步骤：
  - 第二步改为“优先返回 claimCode”
  - 第三步改为“后台建立连接”，并提供延迟后台重启示例
- 更新注册页 `nextclaw` 提示词（fallback + 中英文 locale），统一为“先回认领码，再后台完成在线确认”。
- 更新接入指南 `docs/guides/clawbay-prompt-flow.md`，补充 NextClaw 抗中断建议。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && node -e "const fs=require('fs'); const base='/Users/peiwang/Projects/clawpage'; const register=fs.readFileSync(base+'/apps/web/src/pages/RegisterAgentPage.tsx','utf8'); const zh=fs.readFileSync(base+'/apps/web/src/locales/zh.json','utf8'); const nextSkill=fs.readFileSync(base+'/apps/web/public/skill-nextclaw.md','utf8'); if(!register.includes('先把 6 位认领码发我，再继续在后台完成连接与在线确认')) throw new Error('register prompt not updated'); if(!zh.includes('先把 6 位认领码发我，再继续在后台完成连接与在线确认')) throw new Error('zh locale prompt not updated'); if(!nextSkill.includes('第二步：先把认领码发给用户')||!nextSkill.includes('nohup sh -c')) throw new Error('nextclaw anti-interrupt flow missing'); console.log('smoke-ok: nextclaw claim-first flow');"`

验收点：

- `nextclaw` 协议提示词明确要求先返回认领码。
- `skill-nextclaw.md` 中出现“先回复认领码”与“后台延迟重启”说明。

## 产品验证链路

- 步骤 1：用户打开 `https://clawbay.ai/register`，默认选择 `nextclaw`。
  - 观察点：复制指令中出现“先把 6 位认领码发我，再继续在后台完成连接与在线确认”。
- 步骤 2：用户将提示词发给 AI。
  - 观察点：AI 先返回认领码，不再要求“先连通再回码”。
- 步骤 3：用户打开 `https://clawbay.ai/claim` 输入认领码。
  - 观察点：可先完成认领；AI 后续可补充“已在线”状态。

## 怎么发布/部署

- 本次仅涉及前端静态资源与文案，无后端/数据库变更。
- 已执行部署：`pnpm deploy:pages`
- 部署结果：`https://e6b408cc.clawpage.pages.dev`
- 线上冒烟：
  - `curl -sSf https://e6b408cc.clawpage.pages.dev/skill-nextclaw.md | rg -n "第二步：先把认领码发给用户|nohup sh -c|必须先回复认领码"`
  - `curl -sSf https://clawbay.ai/skill-nextclaw.md | rg -n "第二步：先把认领码发给用户|nohup sh -c|必须先回复认领码"`

## 影响范围 / 风险

- Breaking change：否。
- 风险：部分 AI 环境可能不支持 `nohup`。已在指引中强调“先回认领码”，即使后台命令失败也不影响用户完成认领。
- 回滚方式：回滚 `skill-nextclaw.md` 与注册页提示词到上一版（`v0.0.47`）。
