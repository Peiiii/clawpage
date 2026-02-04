# v0.0.16-clawbay-channel-deps-fix

## 做了什么
- 为 @clawbay/clawbay-channel 补充 @sinclair/typebox 依赖，修复插件安装后缺包报错

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  ```bash
  node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('/Users/peiwang/Projects/clawpage/packages/clawbay-channel/package.json','utf8')); if(!pkg.dependencies||!pkg.dependencies['@sinclair/typebox']){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```

## 怎么发布/部署
- NPM 发布：按 `docs/workflows/npm-release-process.md` 执行
