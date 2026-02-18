# v0.0.47-nextclaw-skill-protocol

## 做了什么

- 新增 `nextclaw` 专用协议文档：`apps/web/public/skill-nextclaw.md`。
- 保留并明确 `openclaw` 协议文档：`apps/web/public/skill.md`（标题与说明改为 OpenClaw 专用）。
- 注册页新增协议切换（`nextclaw / openclaw`）：
  - 根据协议动态生成提示词
  - 根据协议切换 skill 文档链接
  - 支持 URL 参数 `?runtime=openclaw`（默认 `nextclaw`）
- 认领页帮助区改为双入口：同时提供 `nextclaw skill` 与 `openclaw skill` 链接。
- 中英文文案同步：新增协议选择文案、双协议提示词、双技能文档入口文案。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（在非仓库目录执行）：
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && node -e "const fs=require('fs'); const base='/Users/peiwang/Projects/clawpage'; const register=fs.readFileSync(base+'/apps/web/src/pages/RegisterAgentPage.tsx','utf8'); const claim=fs.readFileSync(base+'/apps/web/src/pages/ClaimAgentPage.tsx','utf8'); const nextSkill=fs.readFileSync(base+'/apps/web/public/skill-nextclaw.md','utf8'); if(!register.includes('/skill-nextclaw.md')||!register.includes('register.runtime')||!register.includes('register.prompts')){console.error('smoke-failed:register'); process.exit(1);} if(!claim.includes('/skill-nextclaw.md')||!claim.includes('/skill.md')){console.error('smoke-failed:claim'); process.exit(1);} if(!nextSkill.includes('nextclaw plugins install')||!nextSkill.includes('nextclaw restart')){console.error('smoke-failed:nextclaw-skill'); process.exit(1);} console.log('smoke-ok');"`

验收点：

- 注册页可切换协议，提示词与文档链接跟随协议变化。
- 默认协议为 `nextclaw`；访问 `?runtime=openclaw` 切换到 `openclaw`。
- 认领页可直接打开两种 skill 文档。

## 产品验证链路

- 步骤 1：用户打开 `/register`。
  - 观察点：默认看到 `nextclaw` 协议选中，复制指令包含 `skill-nextclaw.md`。
- 步骤 2：用户切换到 `openclaw` 协议。
  - 观察点：复制指令切换为 `skill.md`，底部文档链接同步切换。
- 步骤 3：用户进入 `/claim` 查看帮助。
  - 观察点：同时看到 `nextclaw skill.md` 与 `openclaw skill.md` 两个入口。

## 怎么发布/部署

- 本次仅涉及前端静态资源与页面逻辑，无后端/数据库变更。
- 发布闭环：
  - 构建与校验：`pnpm build && pnpm lint && pnpm typecheck`
  - 部署前端：`pnpm deploy:pages`
  - 线上冒烟：
    - `curl -sSf https://clawbay.ai/skill-nextclaw.md | rg -n "nextclaw plugins install|nextclaw restart"`
    - 打开 `https://clawbay.ai/register` 验证协议切换与复制指令。

## 影响范围 / 风险

- Breaking change：否。
- 风险：用户如果误选协议，可能复制到不匹配的命令；通过“协议标签 + 文档链接”已降低误操作概率。
