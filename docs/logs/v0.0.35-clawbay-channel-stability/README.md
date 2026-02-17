# v0.0.35-clawbay-channel-stability

## 做了什么

- `clawbay-channel` 增加 WebSocket 心跳机制（`ping/pong` + 超时重连），减少长时间空闲后的“假在线/真断线”。
- `ClawbayConnector` 增加连接等待窗口与心跳保活，修复离线判定过快问题。
- 修复连接替换时的竞态：旧连接 close 事件不再把新连接误判为离线。
- 调整消息派发语义：只有消息真正发到连接后才回传 `ack`，并补发 `run_started`。
- 前端聊天面板对失败事件做去重，避免“执行失败 + 客户端请求失败”重复刷屏。
- 前端过滤无文本 assistant 消息，避免出现“（此消息类型暂不展示）”干扰主路径。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && node -e "const fs=require('fs'); const connector=fs.readFileSync('/Users/peiwang/Projects/clawpage/workers/api/src/do/clawbay-connector.ts','utf8'); const channel=fs.readFileSync('/Users/peiwang/Projects/clawpage/packages/clawbay-channel/src/channel.ts','utf8'); const panel=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/components/ChatPanel.tsx','utf8'); if(!connector.includes('CONNECTION_PING_INTERVAL_MS')||!connector.includes('waitForConnection')){console.error('smoke-failed:connector'); process.exit(1);} if(!channel.includes('HEARTBEAT_INTERVAL_MS')||!channel.includes('type: \"ping\"')){console.error('smoke-failed:channel'); process.exit(1);} if(!panel.includes('hasRenderableAssistantText')||!panel.includes('连接请求失败')){console.error('smoke-failed:panel'); process.exit(1);} console.log('smoke-ok');"`

验收点：

- 渠道链路包含心跳常量与离线缓冲逻辑。
- 前端对重复失败提示有去重保护。

## 产品验证链路

- 步骤 1：用户在 NextClaw 中保持 gateway 运行，进入 ClawBay 聊天页并发送消息。
  - 观察点：进度区块依次显示 `queued -> dispatching -> streaming/completed`。
- 步骤 2：保持会话空闲超过常见网络空闲阈值后再次发送消息。
  - 观察点：若连接短暂抖动，系统优先等待重连窗口，不应立刻报 `Connector offline`。
- 步骤 3：手动断开插件连接后立即发送消息。
  - 观察点：出现单次失败提示，避免重复“执行失败 + 客户端请求失败”双错误。
- 步骤 4：插件恢复连接后继续发送消息。
  - 观察点：同一会话可继续对话，恢复后按正常阶段推进。

## 怎么发布/部署

- API Worker 发布：`pnpm deploy:workers`
  - 发布结果：`clawpage-api`
  - Version ID：`26430a5f-34ba-4aa7-8320-9e88b7afde2d`
- Pages 发布：`pnpm deploy:pages`
  - 预览地址：`https://202ce700.clawpage.pages.dev`
- npm 包发布（按 `docs/workflows/npm-release-process.md`）：
  - `pnpm changeset`（patch：`@clawbay/clawbay-channel`）
  - `pnpm release:version`
  - `pnpm release:publish`
  - 发布结果：`@clawbay/clawbay-channel@0.0.9`
  - Tag：`@clawbay/clawbay-channel@0.0.9`

线上冒烟（非仓库目录执行）：

- `cd /tmp && curl -sSf https://api.clawbay.ai/health`
- `cd /tmp && curl -sSf https://clawbay.ai | head -n 5`
- `cd /tmp && html=$(curl -sSf https://clawbay.ai); asset=$(printf "%s" "$html" | sed -n 's#.*src="\(/assets/index-[^"]*\.js\)".*#\1#p' | head -n1); curl -sSf "https://clawbay.ai$asset" | rg -n "连接请求失败|执行进度" >/dev/null && echo "smoke-ok:$asset"`
- `cd /tmp && npm view @clawbay/clawbay-channel version`
- `cd /tmp && rm -rf /tmp/clawbay-npm-smoke && mkdir -p /tmp/clawbay-npm-smoke && cd /tmp/clawbay-npm-smoke && npm init -y >/dev/null 2>&1 && npm i @clawbay/clawbay-channel@0.0.9 --silent && node -e "const pkg=require('/tmp/clawbay-npm-smoke/node_modules/@clawbay/clawbay-channel/package.json'); if(pkg.version!=='0.0.9'){process.exit(1);} console.log('smoke-ok:'+pkg.version);"`

## 影响范围 / 风险

- Breaking change：否。
- 风险：若用户本地仍缓存旧包版本，需重新安装 `@clawbay/clawbay-channel@0.0.9` 才能获得心跳稳定性修复。
