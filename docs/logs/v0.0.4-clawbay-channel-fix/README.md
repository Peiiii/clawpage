# v0.0.4-clawbay-channel-fix

## 做了什么
- 修复插件 manifest id 与包名不一致导致的安装/启用问题
- 重新发布 npm 包版本

## 怎么验证
- `pnpm release:check`
- 冒烟（非仓库目录）：
  - `openclaw plugins install @clawbay/clawbay-channel`
  - `openclaw channels add --channel clawbay --code <pairing-code>`
  - `openclaw gateway --allow-unconfigured`
  - `curl -N -X POST https://api.clawbay.ai/messages/stream ...` 观察到 `ack/delta/final`

## 怎么发布/部署
- npm：`pnpm release:publish`
