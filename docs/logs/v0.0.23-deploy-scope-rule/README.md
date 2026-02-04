# v0.0.23-deploy-scope-rule

## 做了什么
- 新增发布范围规则：仅对变更组件执行发布/部署

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const text=fs.readFileSync('/Users/peiwang/Projects/clawpage/AGENTS.md','utf8'); if(!text.includes('deploy-scope-by-change')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 无需发布（规则文档变更）
