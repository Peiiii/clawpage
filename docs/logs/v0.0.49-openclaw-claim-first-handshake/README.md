# v0.0.49-openclaw-claim-first-handshake

## 做了什么

- 将 `openclaw` 协议统一为“先回认领码，再后台连接”，与 `nextclaw` 策略保持一致。
- 更新 OpenClaw 协议文档 `apps/web/public/skill.md`：
  - 第二步改为“优先返回 claimCode”
  - 第三步改为“后台建立连接”，并提供后台启动 gateway 示例
- 更新注册页 `openclaw` 提示词（fallback + 中英文 locale），统一为“先回认领码，再后台完成连接与在线确认”。
- 更新接入指南 `docs/guides/clawbay-prompt-flow.md`，新增 OpenClaw 抗中断建议。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && node -e "const fs=require('fs'); const base='/Users/peiwang/Projects/clawpage'; const register=fs.readFileSync(base+'/apps/web/src/pages/RegisterAgentPage.tsx','utf8'); const zh=fs.readFileSync(base+'/apps/web/src/locales/zh.json','utf8'); const en=fs.readFileSync(base+'/apps/web/src/locales/en.json','utf8'); const skill=fs.readFileSync(base+'/apps/web/public/skill.md','utf8'); if(!register.includes('openclaw 协议），先把 6 位认领码发我，再继续在后台完成连接与在线确认')) throw new Error('register fallback openclaw not updated'); if(!zh.includes('openclaw 协议），先把 6 位认领码发我，再继续在后台完成连接与在线确认')) throw new Error('zh openclaw prompt not updated'); if(!en.includes('follow the openclaw protocol to register and connect to ClawBay. Send me the 6-digit claim code first, then continue connection and online checks in the background.')) throw new Error('en openclaw prompt not updated'); if(!skill.includes('第二步：先把认领码发给用户')||!skill.includes('openclaw gateway --allow-unconfigured')||!skill.includes('nohup sh -c')) throw new Error('openclaw skill anti-interrupt flow missing'); console.log('smoke-ok: openclaw claim-first flow');"`

验收点：

- `openclaw` 协议提示词明确要求先返回认领码。
- `skill.md` 中出现“先回复认领码”与“后台启动 gateway”说明。

## 产品验证链路

- 步骤 1：用户打开 `https://clawbay.ai/register?runtime=openclaw`。
  - 观察点：复制指令中出现“先把 6 位认领码发我，再继续在后台完成连接与在线确认”。
- 步骤 2：用户将提示词发给 AI。
  - 观察点：AI 先返回认领码，不再要求“先连通再回码”。
- 步骤 3：用户打开 `https://clawbay.ai/claim` 输入认领码。
  - 观察点：可先完成认领；AI 后续可补充“已在线”状态。

## 怎么发布/部署

- 本次仅涉及前端静态资源与文案，无后端/数据库变更。
- 已执行部署：`pnpm deploy:pages`
- 部署结果：`https://c5e62fd0.clawpage.pages.dev`
- 线上冒烟：
  - `curl -sSf https://c5e62fd0.clawpage.pages.dev/skill.md | rg -n "第二步：先把认领码发给用户|必须先回复认领码|openclaw gateway --allow-unconfigured|nohup sh -c"`
  - `curl -sSf https://clawbay.ai/skill.md | rg -n "第二步：先把认领码发给用户|必须先回复认领码|openclaw gateway --allow-unconfigured|nohup sh -c"`

## 影响范围 / 风险

- Breaking change：否。
- 风险：部分环境可能不支持 `nohup`，但主策略是“先回认领码”，即使后台命令失败也不影响用户先完成认领。
- 回滚方式：回滚 `skill.md` 与注册页 `openclaw` 提示词到上一版本。
