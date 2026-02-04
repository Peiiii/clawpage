# v0.0.12-chat-typing-indicator

## 做了什么
- 发送消息后只显示“正在输入…”提示，不再显示空的 AI 消息气泡
- 首个流式 token 到达时再创建 AI 消息，避免空消息占位

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行，结构验证）：
  ```bash
  node -e "const fs=require('fs'); const hook=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/hooks/useChatStream.ts','utf8'); const panel=fs.readFileSync('/Users/peiwang/Projects/clawpage/apps/web/src/components/ChatPanel.tsx','utf8'); const after=hook.split('onAck')[1]||''; const segment=after.split('onDelta')[0]||''; if(segment.includes('addMessage')){console.error('smoke-failed'); process.exit(1);} if(!panel.includes('正在输入')){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"
  ```
- 线上冒烟（非仓库目录执行）：
  ```bash
  curl -I https://clawbay.ai/
  ```

## 怎么发布/部署
- 远程迁移：`npx wrangler d1 migrations apply clawpage-db --remote --config workers/api/wrangler.toml`
- 部署：`pnpm deploy:pages`
- 线上冒烟：`curl -I https://clawbay.ai/`
