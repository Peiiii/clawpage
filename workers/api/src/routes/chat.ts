import { Hono } from 'hono';
import type { Env } from '../env';
import { createUIMessageStream, createUIMessageStreamResponse, generateId, type UIMessage } from 'ai';
import { EventSourceParserStream, type EventSourceMessage } from 'eventsource-parser/stream';

type ChatRequest = {
  messages?: UIMessage[];
  agent?: {
    name?: string;
    slug?: string;
    description?: string;
  };
  sessionId?: string;
};

type RunEventStage = 'queued' | 'dispatching' | 'streaming' | 'completed' | 'failed';

type RunEventPayload = {
  runId: string;
  stage: RunEventStage;
  label: string;
  detail?: string;
  at: number;
};

type ConnectorStreamPayload = {
  runId?: string;
  delta?: string;
  content?: string;
  error?: string;
  status?: string;
};

type ChatHistoryRow = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  createdAt: number;
};

function extractUserMessageText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user') continue;
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .trim();
    if (text) return text;
  }
  return '';
}

export const chatRouter = new Hono<{ Bindings: Env }>();

chatRouter.get('/history', async (c) => {
  const agentSlug = c.req.query('agentSlug')?.trim();
  if (!agentSlug) {
    return c.json({ error: 'agentSlug required' }, 400);
  }

  const sessionId = c.req.query('sessionId')?.trim();
  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400);
  }

  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(agentSlug).first<{ id: string }>();

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const historyResult = await c.env.DB.prepare(
    `SELECT id, role, content, created_at as createdAt
     FROM messages
     WHERE agent_id = ? AND session_id = ?
     ORDER BY created_at ASC, id ASC
     LIMIT 200`
  )
    .bind(agent.id, sessionId)
    .all<ChatHistoryRow>();

  return c.json({
    sessionId,
    messages: (historyResult.results ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  });
});

chatRouter.post('/', async (c) => {
  let payload: (ChatRequest & { id?: string }) | null = null;
  try {
    payload = await c.req.json<ChatRequest & { id?: string }>();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!payload?.messages || !Array.isArray(payload.messages)) {
    return c.json({ error: 'messages required' }, 400);
  }

  const agentSlug = payload.agent?.slug?.trim();
  if (!agentSlug) {
    return c.json({ error: 'agent slug required' }, 400);
  }

  const sessionId = payload.sessionId?.trim() || (typeof payload.id === 'string' ? payload.id : '');
  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400);
  }

  const content = extractUserMessageText(payload.messages);
  if (!content) {
    return c.json({ error: 'message content required' }, 400);
  }

  const agent = await c.env.DB.prepare(
    'SELECT id FROM agents WHERE slug = ? AND deleted_at IS NULL'
  ).bind(agentSlug).first<{ id: string }>();

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const abortController = new AbortController();
  const clientSignal = c.req.raw.signal;
  clientSignal?.addEventListener('abort', () => abortController.abort(), { once: true });

  const stub = c.env.CLAWBAY_CONNECTOR.get(c.env.CLAWBAY_CONNECTOR.idFromName(agent.id));
  const upstream = await stub.fetch('https://clawbay-connector/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent.id,
      sessionId,
      content,
    }),
    signal: abortController.signal,
  });

  const messageId = generateId();
  const textId = generateId();

  const stream = createUIMessageStream<UIMessage>({
    generateId: () => messageId,
    execute: async ({ writer }) => {
      let textStarted = false;
      let textClosed = false;
      let finished = false;
      let streamedText = '';
      let runId = messageId;
      let emittedStreaming = false;

      const writeRunEvent = (stage: RunEventStage, label: string, detail?: string) => {
        const data: RunEventPayload = {
          runId,
          stage,
          label,
          at: Date.now(),
          ...(detail ? { detail } : {}),
        };
        writer.write({ type: 'data-run_event', data });
      };

      const startTextIfNeeded = () => {
        if (textStarted) return;
        writer.write({ type: 'text-start', id: textId });
        textStarted = true;
      };

      const finishStream = () => {
        if (finished) return;
        if (textStarted && !textClosed) {
          writer.write({ type: 'text-end', id: textId });
          textClosed = true;
        }
        writer.write({ type: 'finish', finishReason: 'stop' });
        finished = true;
      };

      writer.write({ type: 'start', messageId });
      writeRunEvent('queued', '消息已提交，等待 Claw 接收');

      if (!upstream.ok || !upstream.body) {
        writeRunEvent('failed', '连接器不可用', `HTTP ${upstream.status}`);
        writer.write({ type: 'error', errorText: `Connector error: ${upstream.status}` });
        finishStream();
        return;
      }

      const eventStream = upstream.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream()) as ReadableStream<EventSourceMessage>;
      const reader = eventStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value?.data) continue;

          let parsed: ConnectorStreamPayload;
          try {
            parsed = JSON.parse(value.data) as ConnectorStreamPayload;
          } catch {
            writeRunEvent('failed', '连接器返回无效数据');
            writer.write({ type: 'error', errorText: 'Invalid connector payload' });
            break;
          }

          if (typeof parsed.runId === 'string' && parsed.runId.trim()) {
            runId = parsed.runId;
          }

          if (value.event === 'ack') {
            writeRunEvent('dispatching', '已发送到 Claw，等待生成回复');
            continue;
          }

          if (value.event === 'run_started') {
            writeRunEvent('dispatching', 'Claw 已接收任务，准备执行');
            continue;
          }

          if (value.event === 'delta') {
            const delta = typeof parsed.delta === 'string' ? parsed.delta : '';
            if (delta) {
              if (!emittedStreaming) {
                writeRunEvent('streaming', 'Claw 正在生成回复');
                emittedStreaming = true;
              }
              streamedText += delta;
              startTextIfNeeded();
              writer.write({ type: 'text-delta', id: textId, delta });
            }
            continue;
          }

          if (value.event === 'final') {
            const finalText = typeof parsed.content === 'string' ? parsed.content : '';
            if (finalText) {
              let suffix = finalText;
              if (streamedText && finalText.startsWith(streamedText)) {
                suffix = finalText.slice(streamedText.length);
              } else if (streamedText) {
                suffix = finalText;
              }
              if (!suffix) {
                writeRunEvent('completed', '回复完成');
                finishStream();
                await reader.cancel();
                break;
              }
              startTextIfNeeded();
              writer.write({ type: 'text-delta', id: textId, delta: suffix });
            }
            writeRunEvent('completed', '回复完成');
            finishStream();
            await reader.cancel();
            break;
          }

          if (value.event === 'error') {
            const errorText = typeof parsed.error === 'string' && parsed.error.trim()
              ? parsed.error
              : 'Connector error';
            writeRunEvent('failed', '执行失败', errorText);
            writer.write({ type: 'error', errorText });
            finishStream();
            await reader.cancel();
            break;
          }
        }
      } catch (err) {
        const message = String(err);
        writeRunEvent('failed', '连接中断', message);
        writer.write({ type: 'error', errorText: message });
      } finally {
        finishStream();
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
});
