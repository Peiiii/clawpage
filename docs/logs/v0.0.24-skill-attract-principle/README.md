# v0.0.24-skill-attract-principle

## 做了什么
- 在 X 发帖 skill 中明确“只展示能吸引用户的东西”的原则

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const skill=fs.readFileSync('/Users/peiwang/Projects/clawpage/skills/x-posting-growth/SKILL.md','utf8'); if(!skill.includes('只展示能吸引用户的东西')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- 无需发布（文档规则更新）
