# v0.0.50-chat-panel-presence-sync

## 做了什么

- 修复 `apps/web/src/components/ChatPanel.tsx` 顶部状态硬编码问题：不再固定展示“OpenClaw · 实时回复”。
- 聊天头部状态文案改为基于 `currentAgent.isOnline` 动态展示：
  - 在线：`chat.status.online`（在线 · 立即回复）
  - 离线：`chat.status.offline`（离线 · 稍后回复）
- 聊天头部右下角状态指示灯同步改为在线/离线双色，避免“列表离线、会话仍绿色在线”的认知冲突。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行，真实命令/请求）：
  - `cd /tmp && node -e "const fs=require('fs');const path='/Users/peiwang/Projects/clawpage/apps/web/src/components/ChatPanel.tsx';const source=fs.readFileSync(path,'utf8');if(!source.includes('currentAgent.isOnline')||!source.includes(\"chat.status.offline\")||!source.includes(\"chat.status.online\")){throw new Error('chat panel status wiring missing')}" && node -e "(async()=>{const list=await fetch('https://api.clawbay.ai/agents?page=1&pageSize=50');if(!list.ok) throw new Error('agents list http '+list.status);const listJson=await list.json();const offline=(listJson.items||[]).find((item)=>item&&item.isOnline===false&&typeof item.slug==='string');if(!offline) throw new Error('no offline agent found in first 50');const detailResp=await fetch('https://api.clawbay.ai/agents/'+offline.slug);if(!detailResp.ok) throw new Error('agent detail http '+detailResp.status);const detail=await detailResp.json();if(!detail?.success||detail?.data?.isOnline!==false){throw new Error('offline state mismatch for '+offline.slug);}console.log('smoke-ok:'+offline.slug);})().catch((err)=>{console.error(String(err));process.exit(1);});"`

验收点：

- 聊天头部状态文案与 Agent 在线状态一致，不再固定“实时回复”。
- 当 Agent 离线时，聊天头部指示灯与文案同时切到离线样式。

## 用户视角验收路径

- 步骤 1：打开任意 Agent 页面并确认资料卡状态为“离线”。
- 步骤 2：点击 `Enter Terminal` 打开聊天侧栏。
- 步骤 3：观察聊天头部状态文案应显示“离线 · 稍后回复”（或英文对应文案）。
- 步骤 4：观察头像右下角状态点应为离线样式（非绿色在线点）。
- 步骤 5：回到在线 Agent 重复上述步骤，头部应切回“在线 · 立即回复”。

## 怎么发布/部署

- 本次仅前端改动，无后端/数据库改动，无 migration。
- 发布命令（Pages）：`pnpm deploy:pages`
- 线上冒烟（非仓库目录）：
  - `cd /tmp && curl -sSf https://clawbay.ai | head -n 5`
  - 手工验收按“用户视角验收路径”执行。

## 影响范围 / 风险

- Breaking change：否。
- 风险：在线状态来自 Presence 数据，受服务端缓存策略影响，可能存在短时间延迟。
