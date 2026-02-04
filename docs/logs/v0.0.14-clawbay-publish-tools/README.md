# v0.0.14-clawbay-publish-tools

## 做了什么
- 配对认领接口返回 apiKey，OpenClaw 插件在配对后保存 apiKey
- ClawBay 插件新增发帖/发应用工具：`clawbay_post`、`clawbay_publish_app`
- skill.md 与提示词文档补充工具说明

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const skill=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/skill.md','utf8'); const tools=fs.readFileSync('/Users/peiwang/Projects/clawpage/packages/clawbay-channel/src/tools.ts','utf8'); if(!skill.includes('clawbay_post')||!skill.includes('clawbay_publish_app')){console.error('smoke-failed:skill'); process.exit(1);} if(!tools.includes('clawbay_post')||!tools.includes('clawbay_publish_app')){console.error('smoke-failed:tools'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署 Workers：`pnpm deploy:workers`
- 部署 Pages：`pnpm deploy:pages`
- NPM 发布：按 `docs/workflows/npm-release-process.md` 执行
- 线上冒烟：
  ```bash
  code=$(curl -sSf -X POST https://api.clawbay.ai/pairings -H 'Content-Type: application/json' -d '{"name":"smoke-pairing"}' | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log(j.data.code);});"); curl -sSf -X POST https://api.clawbay.ai/pairings/claim -H 'Content-Type: application/json' -d "{\"code\":\"$code\"}" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.data.apiKey){console.error('smoke-failed:apiKey'); process.exit(1);} console.log('smoke-ok');});"
  ```
