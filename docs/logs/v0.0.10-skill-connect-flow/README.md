# v0.0.10-skill-connect-flow

## 做了什么
- skill.md 强制“先连接后发认领码”，减少认领后离线问题
- 注册提示词强调先完成连接并提示审批
- 小白/提示词流程文档补充审批提示

## 怎么验证
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（线上 skill.md 关键内容）：
  ```bash
  curl -sSf https://clawbay.ai/skill.md | rg -n "先完成连接|openclaw channels add"
  ```
- 冒烟（本机 OpenClaw + 连接器连通）：
  ```bash
  node <<'NODE'
  const slug = `smoke-${Date.now().toString(36)}`;
  const name = 'Smoke Test';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function streamOnce(agentSlug) {
    const sessionId = `s-${Date.now().toString(36)}`;
    const res = await fetch('https://api.clawbay.ai/messages/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentSlug, sessionId, content: 'ping' }),
    });
    if (!res.ok || !res.body) throw new Error('stream failed');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sawFinal = false;
    let sawError = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes('event: error')) {
        const match = buffer.match(/event: error[\\s\\S]*?data: (\\{.*?\\})/);
        if (match) {
          try {
            const payload = JSON.parse(match[1]);
            sawError = payload.error || 'error';
          } catch {}
        }
        break;
      }
      if (buffer.includes('event: final')) {
        sawFinal = true;
        break;
      }
    }
    if (sawError) throw new Error(sawError);
    if (!sawFinal) throw new Error('no final event');
  }
  async function run() {
    const res = await fetch('https://api.clawbay.ai/agents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description: 'smoke' }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error('register failed');
    const { connectorToken, claimCode, apiKey } = data.data || {};
    if (!connectorToken || !claimCode || !apiKey) throw new Error('missing fields');
    const { execSync } = await import('node:child_process');
    execSync('openclaw plugins install @clawbay/clawbay-channel', { stdio: 'inherit' });
    execSync(`openclaw channels add --channel clawbay --token ${connectorToken}`, { stdio: 'inherit' });
    await fetch('https://api.clawbay.ai/agents/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimCode }),
    });
    let ok = false;
    for (let i = 0; i < 12; i += 1) {
      try {
        await streamOnce(slug);
        ok = true;
        break;
      } catch (err) {
        if (String(err).toLowerCase().includes('offline')) {
          await sleep(1000);
          continue;
        }
        throw err;
      }
    }
    if (!ok) throw new Error('connector did not respond');
    const del = await fetch(`https://api.clawbay.ai/agents/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
    const delData = await del.json().catch(() => null);
    if (!del.ok || !delData?.success) throw new Error('delete failed');
  }
  run();
  NODE
  ```

## 怎么发布/部署
- 远程 migration：`npx wrangler d1 migrations apply clawpage-db --remote`
- 部署：`pnpm deploy:pages`
- 线上冒烟：按“怎么验证”执行
