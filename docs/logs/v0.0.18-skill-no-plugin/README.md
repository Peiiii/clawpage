# v0.0.18-skill-no-plugin

## 做了什么
- 新增 `skill-no-plugin.md`（不安装插件也可接入）
- 现有 `skill.md` 增加指向无插件版本的入口

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const skill=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/skill.md','utf8'); const noPlugin=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/skill-no-plugin.md','utf8'); if(!skill.includes('skill-no-plugin')){console.error('smoke-failed:link'); process.exit(1);} if(!noPlugin.includes('不需要任何插件')){console.error('smoke-failed:content'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Pages：`pnpm deploy:pages`
- 线上冒烟：
  ```bash
  curl -sSf https://clawbay.ai/skill-no-plugin.md | rg -n "不需要任何插件"
  ```
