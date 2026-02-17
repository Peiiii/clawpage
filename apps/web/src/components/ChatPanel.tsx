import { useState, useEffect, useMemo, useRef } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store'
import { API_BASE } from '@/lib/api'
import { generateSessionId, cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'

type RunEventStage = 'queued' | 'dispatching' | 'streaming' | 'completed' | 'failed'

type RunEvent = {
  runId: string
  stage: RunEventStage
  label: string
  detail?: string
  at: number
}

type ChatDataParts = {
  run_event: RunEvent
}

type ChatMessage = UIMessage<unknown, ChatDataParts>

type ChatHistoryMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  createdAt: number
}

type ChatHistoryResponse = {
  sessionId: string
  messages: ChatHistoryMessage[]
}

const SESSION_STORAGE_PREFIX = 'clawbay:chat-session:'

const RUN_STAGE_STYLES: Record<RunEventStage, { dotClass: string; labelClass: string }> = {
  queued: {
    dotClass: 'bg-sky-400',
    labelClass: 'text-sky-500',
  },
  dispatching: {
    dotClass: 'bg-indigo-400',
    labelClass: 'text-indigo-500',
  },
  streaming: {
    dotClass: 'bg-emerald-400 animate-pulse',
    labelClass: 'text-emerald-500',
  },
  completed: {
    dotClass: 'bg-green-500',
    labelClass: 'text-green-500',
  },
  failed: {
    dotClass: 'bg-red-500',
    labelClass: 'text-red-500',
  },
}

function isRunEventStage(value: unknown): value is RunEventStage {
  return value === 'queued' || value === 'dispatching' || value === 'streaming' || value === 'completed' || value === 'failed'
}

function normalizeRunEvent(value: unknown): RunEvent | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<RunEvent>
  if (typeof payload.runId !== 'string' || !payload.runId.trim()) return null
  if (!isRunEventStage(payload.stage)) return null
  if (typeof payload.label !== 'string' || !payload.label.trim()) return null

  return {
    runId: payload.runId,
    stage: payload.stage,
    label: payload.label,
    detail: typeof payload.detail === 'string' && payload.detail.trim() ? payload.detail : undefined,
    at: typeof payload.at === 'number' && Number.isFinite(payload.at) ? payload.at : Date.now(),
  }
}

function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString([], { hour12: false })
}

function hasRenderableAssistantText(message: ChatMessage): boolean {
  return message.parts.some((part) => part.type === 'text' && part.text.trim().length > 0)
}

function resolveSessionId(agentSlug: string | undefined): string {
  const fallbackSessionId = generateSessionId()
  if (!agentSlug || typeof window === 'undefined') return fallbackSessionId

  try {
    const storageKey = `${SESSION_STORAGE_PREFIX}${agentSlug}`
    const storedSessionId = window.localStorage.getItem(storageKey)?.trim()
    if (storedSessionId) return storedSessionId
    window.localStorage.setItem(storageKey, fallbackSessionId)
    return fallbackSessionId
  } catch {
    return fallbackSessionId
  }
}

function toChatMessage(message: ChatHistoryMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'agent' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: message.content }],
  }
}

export function ChatPanel() {
  const { t } = useTranslation()
  const { currentAgent } = useChatStore()
  const agentSlug = currentAgent?.slug
  const [input, setInput] = useState('')
  const [runEvents, setRunEvents] = useState<RunEvent[]>([])
  const [sessionId, setSessionId] = useState(() => resolveSessionId(agentSlug))
  const [historyLoading, setHistoryLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatId = useMemo(
    () => (agentSlug ? `${agentSlug}:${sessionId}` : sessionId),
    [agentSlug, sessionId]
  )
  const transport = useMemo(
    () => new DefaultChatTransport({ api: `${API_BASE}/chat` }),
    []
  )

  const { messages: rawMessages, sendMessage, status, error, setMessages } = useChat<ChatMessage>({
    id: chatId,
    transport,
    onData: (dataPart) => {
      if (dataPart.type !== 'data-run_event') return
      const nextEvent = normalizeRunEvent(dataPart.data)
      if (!nextEvent) return

      setRunEvents((previous) => {
        const duplicated = previous.some(
          (item) =>
            (
              item.runId === nextEvent.runId &&
              item.stage === nextEvent.stage &&
              Math.abs(item.at - nextEvent.at) < 1500
            ) || (
              item.stage === 'failed' &&
              nextEvent.stage === 'failed' &&
              item.detail === nextEvent.detail &&
              Math.abs(item.at - nextEvent.at) < 3000
            )
        )
        if (duplicated) return previous
        return [...previous, nextEvent].slice(-20)
      })
    },
  })

  const messages = useMemo(
    () => rawMessages.filter((message) => message.role !== 'system' && (message.role !== 'assistant' || hasRenderableAssistantText(message))),
    [rawMessages]
  )
  const recentRunEvents = useMemo(() => runEvents.slice(-4), [runEvents])
  const latestRunEvent = recentRunEvents[recentRunEvents.length - 1]
  const isBusy = historyLoading || status === 'streaming' || status === 'submitted'

  useEffect(() => {
    const nextSessionId = resolveSessionId(agentSlug)
    setSessionId(nextSessionId)
    setInput('')
    setRunEvents([])
  }, [agentSlug])

  useEffect(() => {
    if (!agentSlug || !sessionId) {
      setMessages([])
      setHistoryLoading(false)
      return
    }

    const abortController = new AbortController()

    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const url = new URL(`${API_BASE}/chat/history`)
        url.searchParams.set('agentSlug', agentSlug)
        url.searchParams.set('sessionId', sessionId)
        const response = await fetch(url.toString(), { signal: abortController.signal })
        if (!response.ok) {
          throw new Error(`history request failed: ${response.status}`)
        }

        const payload = await response.json() as ChatHistoryResponse
        if (abortController.signal.aborted) return

        const historyMessages = Array.isArray(payload.messages)
          ? payload.messages
            .filter((message) => message && (message.role === 'user' || message.role === 'agent') && typeof message.content === 'string')
            .map(toChatMessage)
          : []

        setMessages(historyMessages)
      } catch (loadError) {
        if (abortController.signal.aborted) return
        console.error('Failed to load chat history', loadError)
        setMessages([])
      } finally {
        if (!abortController.signal.aborted) {
          setHistoryLoading(false)
        }
      }
    }

    void loadHistory()

    return () => {
      abortController.abort()
    }
  }, [agentSlug, sessionId, setMessages])

  useEffect(() => {
    if (!error) return
    setRunEvents((previous) => {
      const now = Date.now()
      const latestFailedEvent = [...previous].reverse().find((item) => item.stage === 'failed')
      if (latestFailedEvent && latestFailedEvent.detail === error.message && now - latestFailedEvent.at < 5000) {
        return previous
      }

      const fallbackEvent: RunEvent = {
        runId: `client-${Date.now()}`,
        stage: 'failed',
        label: '连接请求失败',
        detail: error.message,
        at: now,
      }
      return [...previous, fallbackEvent].slice(-20)
    })
  }, [error])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentAgent || isBusy) return

    const content = input.trim()
    setInput('')
    try {
      await sendMessage(
        { text: content },
        {
          body: {
            agent: {
              slug: currentAgent.slug,
              name: currentAgent.name,
              description: currentAgent.description,
            },
            sessionId,
          },
        }
      )
    } catch {
      // Ignore and let UI handle failed state
    }
  }

  if (!currentAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-4">
          <Bot className="w-10 h-10 text-pink-400" />
        </div>
        <h4 className="font-semibold mb-1">选择一个 Claw 开始对话</h4>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          从列表中选择一个 AI Agent 开始聊天
        </p>
      </div>
    )
  }

  const statusText = t('chat.status.ai', 'OpenClaw · 实时回复')

  const renderMessageText = (message: ChatMessage) => {
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .trim()
    return text || t('chat.unsupportedMessage', '（此消息类型暂不展示）')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center overflow-hidden ring-2 ring-pink-500/20">
            {currentAgent?.avatarUrl ? (
              <img src={currentAgent.avatarUrl} alt={currentAgent.name} className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ring-2 ring-background flex items-center justify-center bg-emerald-500">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-base">{currentAgent?.name}</h3>
          <p className="text-xs flex items-center gap-1 text-emerald-400">
            <Sparkles className="w-3 h-3" />
            {statusText}
            {latestRunEvent ? <span className="text-muted-foreground">· {latestRunEvent.label}</span> : null}
          </p>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">执行进度</span>
          {latestRunEvent ? (
            <span className={cn('text-xs font-medium', RUN_STAGE_STYLES[latestRunEvent.stage].labelClass)}>
              {latestRunEvent.stage}
            </span>
          ) : null}
        </div>

        {recentRunEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">发送消息后，这里会显示执行时间线。</p>
        ) : (
          <div className="space-y-2">
            {recentRunEvents.map((event) => {
              const styles = RUN_STAGE_STYLES[event.stage]
              return (
                <div key={`${event.runId}-${event.stage}-${event.at}`} className="flex items-start gap-2">
                  <span className={cn('mt-1 inline-flex h-2 w-2 rounded-full flex-shrink-0', styles.dotClass)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground/90 truncate">{event.label}</span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatEventTime(event.at)}</span>
                    </div>
                    {event.detail ? <p className="text-[11px] text-muted-foreground mt-0.5">{event.detail}</p> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-pink-400" />
            </div>
            <h4 className="font-semibold mb-1">开始和 {currentAgent?.name} 对话</h4>
            <p className="text-sm text-muted-foreground max-w-[240px]">
              {historyLoading ? '正在恢复历史对话…' : '发送消息开始对话，AI 会立即回复你'}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg',
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : 'bg-gradient-to-br from-pink-500 to-rose-500'
            )}>
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
                : 'bg-muted/80 backdrop-blur-sm rounded-bl-md border border-border/50'
            )}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageText(message)}</p>
            </div>
          </div>
        ))}

        {isBusy && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                正在输入…
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border border-border/50">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-red-500">
                {error.message}
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border/50">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={historyLoading ? '正在恢复历史...' : '输入消息...'}
            disabled={historyLoading}
            className="w-full h-11 pl-4 pr-12 rounded-xl bg-muted/50 border border-border/50 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-pink-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
