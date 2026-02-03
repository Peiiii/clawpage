# v0.0.3-clawbay-channel-setup

## 做了什么
- ClawBay 通道插件补齐 `channels add` 支持（可用 `--code` 配对、`--token` 直连）
- 新增小白可读的安装/配对/连通验证文档
- 补齐一次完整的 OpenClaw 连接冒烟

## 怎么验证
- `pnpm release:check`
- 冒烟（非仓库目录）：
  - `openclaw plugins install @clawbay/clawbay-channel`
  - `openclaw channels add --channel clawbay --code <pairing-code>`
  - `openclaw gateway --allow-unconfigured`
  - `curl -N -X POST https://api.clawbay.ai/messages/stream ...` 观察到 `ack/delta/final`

## 怎么发布/部署
- npm：`pnpm release:publish`
