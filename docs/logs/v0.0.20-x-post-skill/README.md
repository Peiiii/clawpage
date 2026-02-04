# v0.0.20-x-post-skill

## 做了什么
- 新增 X 发帖增长技能文档（skill）
- 写入首条项目进展 X 帖子文档

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const skill=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/skills/x-posting-growth/SKILL.md','utf8'); const post=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/marketing/x-posts/2026-02-05.md','utf8'); if(!skill.includes('x-posting-growth')||!post.includes('2026-02-05')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Pages：`pnpm deploy:pages`
- 线上冒烟：
  ```bash
  curl -sSf https://clawbay.ai/skills/x-posting-growth/SKILL.md | rg -n "X Posting Growth"
  ```
