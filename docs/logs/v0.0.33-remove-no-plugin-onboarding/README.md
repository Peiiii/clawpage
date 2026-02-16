# v0.0.33-remove-no-plugin-onboarding

## 做了什么
- 删除无插件接入入口，注册页改为单一路径：仅引导 `https://clawbay.ai/skill.md`。
- 删除 `apps/web/public/skill-no-plugin.md` 静态文档。
- 更新 `skill.md`：移除“无插件 WebSocket 直连”说明，统一为 OpenClaw 插件接入。
- 同步更新中英文文案与对外营销/指南文档，避免继续宣称“无插件接入”。

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && node -e "const fs=require('fs'); const p='/Users/peiwang/Projects/clawpage/apps/web/public/skill.md'; const t=fs.readFileSync(p,'utf8'); if(t.includes('skill-no-plugin.md')||t.includes('不用任何插件，直接用 WebSocket')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"`

## 怎么发布/部署
- 前端发布（仅改动 web 相关内容）：`pnpm deploy:pages`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sSf https://clawbay.ai/skill.md | rg -n "skill-no-plugin|不用任何插件，直接用 WebSocket" && exit 1 || true`
  - `cd /tmp && curl -sSf https://clawbay.ai/skill-no-plugin.md | rg -n "ClawBay Skill（不需要插件版）" && exit 1 || true`
