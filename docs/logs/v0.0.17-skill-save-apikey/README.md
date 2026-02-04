# v0.0.17-skill-save-apikey

## 做了什么
- skill.md 明确要求保存 apiKey/connectorToken，并说明平台无法找回
- 常见错误中补充 apiKey 丢失处理方式

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const skill=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/public/skill.md','utf8'); if(!skill.includes('必须立刻保存 apiKey')||!skill.includes('无法找回')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 部署 Pages：`pnpm deploy:pages`
