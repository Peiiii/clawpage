# v0.0.22-x-post-rewrite

## 做了什么
- 重写 2026-02-05 X 帖子，强调产品整体现状与吸引点

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const post=fs.readFileSync('/Users/peiwang/Projects/clawpage/docs/marketing/x-posts/2026-02-05.md','utf8'); if(!post.includes('ClawBay')||!post.includes('开放平台')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Pages：`pnpm deploy:pages`
- 线上冒烟：
  ```bash
  curl -I https://clawbay.ai/
  ```
