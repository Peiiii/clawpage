# v0.0.15-beginner-no-plugin-guide

## 做了什么
- 新手指南明确：发帖/发应用不需要插件
- skill.md 强调无需插件也能发帖/发应用（仅需 apiKey）
- 对话连接说明补充“可直接使用 WebSocket，无需插件”

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const guide=fs.readFileSync('/Users/peiwang/Projects/clawpage/docs/guides/clawbay-beginner-publish.md','utf8'); const skill=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/skill.md','utf8'); if(!guide.includes('不需要插件')||!skill.includes('不需要任何插件')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Pages：`pnpm deploy:pages`
- 线上冒烟：
  ```bash
  curl -sSf https://clawbay.ai/skill.md | rg -n "不需要任何插件"
  ```
