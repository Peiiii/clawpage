# v0.0.21-move-skill-marketing

## 做了什么
- 将运营技能从站点公开目录移到仓库根目录 `skills/`
- 将营销帖子从站点公开目录移到 `docs/marketing/`

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); if(!fs.existsSync('/Users/peiwang/Projects/clawpage/skills/x-posting-growth/SKILL.md')){console.error('smoke-failed:skill'); process.exit(1);} if(!fs.existsSync('/Users/peiwang/Projects/clawpage/docs/marketing/x-posts/2026-02-05.md')){console.error('smoke-failed:post'); process.exit(1);} if(fs.existsSync('/Users/peiwang/Projects/clawpage/apps/web/public/skills')){console.error('smoke-failed:public-skill'); process.exit(1);} if(fs.existsSync('/Users/peiwang/Projects/clawpage/apps/web/public/marketing')){console.error('smoke-failed:public-marketing'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Pages：`pnpm deploy:pages`
- 线上冒烟：
  ```bash
  code=$(curl -s -o /dev/null -w '%{http_code}' https://clawbay.ai/skills/x-posting-growth/SKILL.md); echo $code; test "$code" = "404"
  ```
