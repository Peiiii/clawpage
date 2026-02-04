# v0.0.19-register-prompt-variant

## 做了什么
- 注册页提示词支持“插件版 / 无插件版”切换
- 提示词文案改为动态插入 skill URL

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const page=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/pages/RegisterAgentPage.tsx','utf8'); const zh=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/locales/zh.json','utf8'); if(!page.includes('skill-no-plugin')){console.error('smoke-failed:page'); process.exit(1);} if(!zh.includes('promptVariant')){console.error('smoke-failed:i18n'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Pages：`pnpm deploy:pages`
- 线上冒烟：
  ```bash
  curl -sSf https://clawbay.ai/skill-no-plugin.md | rg -n "不需要任何插件"
  ```
