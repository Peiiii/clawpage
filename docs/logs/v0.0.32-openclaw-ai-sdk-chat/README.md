# 2026-02-08 OpenClaw AI SDK Chat Stream

## 背景 / 问题

- 对话能力需要完全回到 OpenClaw 连接器链路
- 前端不再自研流式逻辑，统一使用 AI SDK
- 旧 Gateway 方案不再保留

## 变更内容

- `/chat` 改为转发 OpenClaw 连接器 SSE，并转换为 AI SDK UI Message Stream
- 恢复 `/connectors/ws` 供 OpenClaw 插件连接
- `/agents/register` 增加 connectorToken 生成与落库
- 移除 Gateway 配置接口与相关表（agent_gateways / gateway_sessions）
- 前端 `ChatPanel` 继续使用 `@ai-sdk/react`，请求携带 sessionId
- 文档更新：OpenClaw 架构说明补充 `/chat` 说明

## 验证（怎么确认符合预期）

```bash
pnpm lint
pnpm build
pnpm typecheck

# smoke-check（部署后在非仓库目录执行）
cd /tmp

# 1) 申请配对码 -> 认领 -> 获取 connectorToken 与 agent slug
name="smoke-openclaw-$(date +%s)"
code=$(curl -sSf -X POST https://api.clawbay.ai/pairings \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$name\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.data.code);});")

payload=$(curl -sSf -X POST https://api.clawbay.ai/pairings/claim \
  -H 'Content-Type: application/json' \
  -d "{\"code\":\"$code\"}")

token=$(node -e "const j=JSON.parse(process.argv[1]);console.log(j.data.connectorToken);" "$payload")
slug=$(node -e "const j=JSON.parse(process.argv[1]);console.log(j.data.agent.slug);" "$payload")

# 2) 启动临时 WS 连接器（模拟 OpenClaw）
mkdir -p /tmp/clawbay-smoke
cd /tmp/clawbay-smoke
npm init -y >/dev/null 2>&1
npm install ws@8 >/dev/null 2>&1

cat > ws-echo.mjs <<'EOF'
import WebSocket from 'ws';

const token = process.env.CONNECTOR_TOKEN;
const ws = new WebSocket(`wss://api.clawbay.ai/connectors/ws?token=${token}`);

ws.on('open', () => {
  console.log('ws-ready');
});

ws.on('message', (data) => {
  let payload;
  try {
    payload = JSON.parse(String(data));
  } catch {
    return;
  }
  if (payload.type !== 'user_message') return;
  ws.send(JSON.stringify({ type: 'delta', runId: payload.runId, delta: 'hello' }));
  ws.send(JSON.stringify({ type: 'final', runId: payload.runId, content: 'hello' }));
});
EOF

CONNECTOR_TOKEN="$token" node ws-echo.mjs &
sleep 2

# 3) 调用 /chat 并观察 UI Message Stream
curl -s -X POST https://api.clawbay.ai/chat \
  -H 'Content-Type: application/json' \
  -d "{\"messages\":[{\"id\":\"u1\",\"role\":\"user\",\"parts\":[{\"type\":\"text\",\"text\":\"ping\"}]}],\"agent\":{\"slug\":\"$slug\"},\"sessionId\":\"smoke-session\"}" | head -n 8

# 4) 关闭临时 WS 并清理
pkill -f ws-echo.mjs
rm -rf /tmp/clawbay-smoke
```

验收点：

- `/chat` 返回 UI Message Stream（含 text-start / text-delta / text-end）
- OpenClaw WebSocket 能收到 user_message 并返回 delta/final

用户视角验收（界面）：

1) 打开任意已认领的 Claw 页面（`https://clawbay.ai/a/<slug>`）。
2) 确认 Claw 在线状态为“在线”（或刷新后仍为在线）。
3) 在对话框发送一句话（如“你好”）。
4) 观察回复为流式逐字出现，不应出现“未在线”错误提示。
5) 连续发送两次消息，确认顺序正确、无重复消息。

## 发布 / 部署

```bash
npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml
pnpm deploy:workers
pnpm deploy:pages
```

备注：移除 Gateway 表，需执行远程迁移。
