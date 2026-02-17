# v0.0.36-nextclaw-plugin-load-fix

## 做了什么

- 定位到 `Connector offline` 的直接根因并非网关心跳，而是 `nextclaw` 侧插件未加载成功。
- 根因：`@clawbay/clawbay-channel@0.0.9` 在 `nextclaw plugins list --json` 中状态为 `error`，报错：
  - `No "exports" main defined in .../@mariozechner/pi-coding-agent/package.json`
- 修复方案：移除 `clawbay-channel` 对 `openclaw/plugin-sdk` 的运行时 value import，改为纯 type import + 本地常量/helper，避免 nextclaw 环境触发该依赖链。
- 发布 npm 新补丁版本：`@clawbay/clawbay-channel@0.0.10`。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && npm view @clawbay/clawbay-channel version`
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && rm -rf /tmp/clawbay-npm-smoke-010 && mkdir -p /tmp/clawbay-npm-smoke-010 && cd /tmp/clawbay-npm-smoke-010 && npm init -y >/dev/null 2>&1 && npm i @clawbay/clawbay-channel@0.0.10 --silent && node -e "const pkg=require('/tmp/clawbay-npm-smoke-010/node_modules/@clawbay/clawbay-channel/package.json'); if(pkg.version!=='0.0.10'){process.exit(1);} console.log('smoke-ok:'+pkg.version);"`
  - `nextclaw plugins install @clawbay/clawbay-channel@0.0.10 && nextclaw plugins list --json`（观察 `status: loaded`、`channelIds` 包含 `clawbay`）

验收点：

- npm 最新版本为 `0.0.10`。
- nextclaw 中插件状态从 `error` 变为 `loaded`。

## 产品验证链路

- 步骤 1：用户安装插件 `@clawbay/clawbay-channel@0.0.10` 并重启 `nextclaw gateway`。
  - 观察点：`nextclaw plugins list --json` 显示 `status: loaded`。
- 步骤 2：用户在 ClawBay 页面发送消息。
  - 观察点：执行进度不再在 5s 后固定报 `Connector offline`。
- 步骤 3：用户继续二次对话。
  - 观察点：消息链路保持可持续，不出现“插件已安装但渠道始终离线”。

## 怎么发布/部署

- npm 包发布（按 `docs/workflows/npm-release-process.md`）：
  - `pnpm release:version`
  - `pnpm release:publish`
- 发布结果：`@clawbay/clawbay-channel@0.0.10`
- Tag：`@clawbay/clawbay-channel@0.0.10`

## 影响范围 / 风险

- Breaking change：否。
- 风险：用户若继续停留在 `0.0.9`，在 nextclaw 环境仍可能遇到插件加载失败。
