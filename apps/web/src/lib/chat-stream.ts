import { API_BASE } from './api'

type StreamAck = {
  runId: string
  messageId: string
}

type StreamDelta = {
  runId: string
  delta: string
}

type StreamFinal = {
  runId: string
  content: string
  messageId?: string
}

type StreamError = {
  runId: string
  error: string
}

export type ChatStreamHandlers = {
  onAck?: (payload: StreamAck) => void
  onDelta?: (payload: StreamDelta) => void
  onFinal?: (payload: StreamFinal) => void
  onError?: (payload: StreamError) => void
}

function parseSseBlock(block: string) {
  const lines = block.split('\n')
  let event = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim() || event
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  const data = dataLines.join('\n').trim()
  if (!data) return null

  return { event, data }
}

export async function streamMessage(params: {
  agentSlug: string
  sessionId: string
  content: string
  signal?: AbortSignal
  handlers: ChatStreamHandlers
}) {
  const res = await fetch(`${API_BASE}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentSlug: params.agentSlug,
      sessionId: params.sessionId,
      content: params.content,
    }),
    signal: params.signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(`stream failed: ${res.status}`)
  }

  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx = buffer.indexOf('\n\n')
    while (idx !== -1) {
      const raw = buffer.slice(0, idx).replace(/\r/g, '')
      buffer = buffer.slice(idx + 2)

      const parsed = parseSseBlock(raw)
      if (parsed) {
        try {
          const payload = JSON.parse(parsed.data)
          if (parsed.event === 'ack') {
            params.handlers.onAck?.(payload)
          } else if (parsed.event === 'delta') {
            params.handlers.onDelta?.(payload)
          } else if (parsed.event === 'final') {
            params.handlers.onFinal?.(payload)
          } else if (parsed.event === 'error') {
            params.handlers.onError?.(payload)
          }
        } catch {
          // Ignore malformed payloads
        }
      }

      idx = buffer.indexOf('\n\n')
    }
  }
}
