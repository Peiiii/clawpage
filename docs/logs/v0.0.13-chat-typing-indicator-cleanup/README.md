# v0.0.13-chat-typing-indicator-cleanup

## 做了什么
- 移除重复的加载气泡，仅保留“正在输入…”提示
- 避免同时出现加载点点和“正在输入…”的双状态

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const panel=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/components/ChatPanel.tsx','utf8'); if(!panel.includes('正在输入')){console.error('smoke-failed:missing-typing'); process.exit(1);} if(panel.includes('animate-bounce')){console.error('smoke-failed:loading-dots-still-present'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署：`pnpm deploy:pages`
- 线上冒烟：`curl -I https://clawbay.ai/`
