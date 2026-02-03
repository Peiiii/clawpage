import type { Env } from '../env';

type ConnectorRecord = {
  id: string;
  agent_id: string;
};

type RunState = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  sendEvent: (event: string, data: unknown) => void;
  assistantText: string;
  agentId: string;
  sessionId: string;
  userMessageId: string;
};

type ConnectorConnection = {
  connectorId: string;
  agentId: string;
  socket: WebSocket;
};

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function loadConnectorByToken(db: Env['DB'], token: string) {
  const tokenHash = await hashToken(token);
  return db
    .prepare('SELECT id, agent_id FROM clawbay_connectors WHERE token_hash = ?')
    .bind(tokenHash)
    .first<ConnectorRecord>();
}

async function touchConnector(db: Env['DB'], connectorId: string) {
  const now = Date.now();
  await db
    .prepare('UPDATE clawbay_connectors SET updated_at = ?, last_seen_at = ? WHERE id = ?')
    .bind(now, now, connectorId)
    .run();
}

export class ClawbayConnector {
  private state: DurableObjectState;
  private env: Env;
  private connection: ConnectorConnection | null = null;
  private runs = new Map<string, RunState>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/connect') {
      return this.handleConnect(request);
    }
    if (url.pathname === '/stream') {
      return this.handleStream(request);
    }
    return new Response('Not Found', { status: 404 });
  }

  private async handleConnect(request: Request): Promise<Response> {
    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return new Response('Token required', { status: 400 });
    }

    const connector = await loadConnectorByToken(this.env.DB, token);
    if (!connector) {
      return new Response('Unauthorized', { status: 401 });
    }

    const upgradeHeader = request.headers.get('Upgrade') || '';
    if (upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const socket = pair[1];

    socket.accept();
    this.connection?.socket.close(1000, 'replaced');
    this.connection = {
      connectorId: connector.id,
      agentId: connector.agent_id,
      socket,
    };
    await touchConnector(this.env.DB, connector.id);

    socket.addEventListener('message', (event) => {
      this.handleConnectorMessage(event);
    });
    socket.addEventListener('close', () => {
      this.handleConnectorClose();
    });
    socket.addEventListener('error', () => {
      this.handleConnectorClose();
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleStream(request: Request): Promise<Response> {
    let body: { agentId?: string; sessionId?: string; content?: string } = {};
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const sessionId = body.sessionId;
    const content = body.content;
    if (!sessionId || !content) {
      return new Response('sessionId and content required', { status: 400 });
    }

    const connection = this.connection;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(encodeSse(event, data)));
        };

        if (!connection) {
          sendEvent('error', { runId: '', error: 'Connector offline' });
          controller.close();
          return;
        }

        const runId = crypto.randomUUID();
        const userMessageId = crypto.randomUUID();
        const now = Date.now();

        await this.env.DB.prepare(
          `INSERT INTO messages (id, agent_id, session_id, role, content, status, created_at)
           VALUES (?, ?, ?, 'user', ?, 'pending', ?)`
        )
          .bind(userMessageId, body.agentId || connection.agentId, sessionId, content, now)
          .run();

        this.runs.set(runId, {
          controller,
          sendEvent,
          assistantText: '',
          agentId: body.agentId || connection.agentId,
          sessionId,
          userMessageId,
        });

        sendEvent('ack', { runId, messageId: userMessageId });

        await this.env.DB.prepare(
          'UPDATE messages SET status = ? WHERE id = ?'
        )
          .bind('sent', userMessageId)
          .run();

        connection.socket.send(
          JSON.stringify({
            type: 'user_message',
            runId,
            sessionId,
            content,
          })
        );
      },
      cancel: () => {
        // Cleanup happens when the run is finalized or errored.
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  private async handleConnectorMessage(event: MessageEvent) {
    const connection = this.connection;
    if (!connection) return;

    await touchConnector(this.env.DB, connection.connectorId);

    let payload: { type?: string; runId?: string; delta?: string; content?: string; error?: string };
    try {
      payload = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (!payload.runId) return;
    const run = this.runs.get(payload.runId);
    if (!run) return;

    if (payload.type === 'delta' && payload.delta) {
      run.assistantText += payload.delta;
      run.sendEvent('delta', { runId: payload.runId, delta: payload.delta });
      return;
    }

    if (payload.type === 'error') {
      await this.env.DB.prepare('UPDATE messages SET status = ? WHERE id = ?')
        .bind('failed', run.userMessageId)
        .run();
      run.sendEvent('error', { runId: payload.runId, error: payload.error || 'Connector error' });
      run.controller.close();
      this.runs.delete(payload.runId);
      return;
    }

    if (payload.type === 'final') {
      const agentMessageId = crypto.randomUUID();
      const content = payload.content ?? run.assistantText;
      if (content && content.trim()) {
        await this.env.DB.prepare(
          `INSERT INTO messages (id, agent_id, session_id, role, content, status, created_at)
           VALUES (?, ?, ?, 'agent', ?, 'delivered', ?)`
        )
          .bind(agentMessageId, run.agentId, run.sessionId, content, Date.now())
          .run();
      }
      run.sendEvent('final', { runId: payload.runId, content, messageId: agentMessageId });
      run.controller.close();
      this.runs.delete(payload.runId);
    }
  }

  private handleConnectorClose() {
    for (const [runId, run] of this.runs.entries()) {
      run.sendEvent('error', { runId, error: 'Connector disconnected' });
      run.controller.close();
      this.runs.delete(runId);
    }
    this.connection = null;
  }
}
