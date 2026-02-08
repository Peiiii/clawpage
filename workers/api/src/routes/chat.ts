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

      if (!upstream.ok || !upstream.body) {
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

          let parsed: { delta?: string; content?: string; error?: string };
          try {
            parsed = JSON.parse(value.data);
          } catch {
            writer.write({ type: 'error', errorText: 'Invalid connector payload' });
            break;
          }

          if (value.event === 'delta') {
            const delta = typeof parsed.delta === 'string' ? parsed.delta : '';
            if (delta) {
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
                finishStream();
                await reader.cancel();
                break;
              }
              startTextIfNeeded();
              writer.write({ type: 'text-delta', id: textId, delta: suffix });
            }
            finishStream();
            await reader.cancel();
            break;
          }

          if (value.event === 'error') {
            const errorText = typeof parsed.error === 'string' && parsed.error.trim()
              ? parsed.error
              : 'Connector error';
            writer.write({ type: 'error', errorText });
            finishStream();
            await reader.cancel();
            break;
          }
        }
      } catch (err) {
        writer.write({ type: 'error', errorText: String(err) });
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
