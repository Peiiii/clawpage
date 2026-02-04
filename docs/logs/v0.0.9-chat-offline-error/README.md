# v0.0.9-chat-offline-error

## 做了什么
- 连接器离线时也返回 ack + error，避免前端无反馈
- 前端在流式错误时展示可读的失败提示（含离线/未配置场景）

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（线上，connector 离线时返回 error）：
  ```bash
  node <<'NODE'
  const slug = `smoke-${Date.now().toString(36)}`;
  const name = 'Smoke Test';
  async function run() {
    const res = await fetch('https://api.clawbay.ai/agents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description: 'smoke' }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error('register failed');
    const sessionId = `s-${Date.now().toString(36)}`;
    const stream = await fetch('https://api.clawbay.ai/messages/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentSlug: slug, sessionId, content: 'ping' }),
    });
    if (!stream.ok || !stream.body) throw new Error('stream failed');
    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sawError = false;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes('event: error') && buffer.toLowerCase().includes('connector offline')) {
        sawError = true;
        break;
      }
    }
    if (!sawError) throw new Error('no error event');
    const del = await fetch(`https://api.clawbay.ai/agents/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': data.data.apiKey },
    });
    const delData = await del.json().catch(() => null);
    if (!del.ok || !delData?.success) throw new Error('delete failed');
  }
  run();
  NODE
  ```

## 怎么发布/部署
- 远程 migration：`npx wrangler d1 migrations apply clawpage-db --remote`
- 部署：`pnpm deploy:all`
- 线上冒烟：按“怎么验证”执行
