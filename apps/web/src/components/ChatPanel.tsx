import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarkdownRenderer } from './MarkdownRenderer'
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

type ChatSessionSummary = {
  sessionId: string
  lastMessageAt: number
  messageCount: number
  lastMessagePreview?: string
}

type ChatSessionsResponse = {
  sessions: ChatSessionSummary[]
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

function resolveSessionStorageKey(agentSlug: string): string {
  return `${SESSION_STORAGE_PREFIX}${agentSlug}`
}

function loadStoredSessionId(agentSlug: string | undefined): string | undefined {
  if (!agentSlug || typeof window === 'undefined') return undefined
  try {
    const value = window.localStorage.getItem(resolveSessionStorageKey(agentSlug))?.trim()
    return value || undefined
  } catch {
    return undefined
  }
}

function persistSessionId(agentSlug: string | undefined, sessionId: string) {
  if (!agentSlug || !sessionId || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(resolveSessionStorageKey(agentSlug), sessionId)
  } catch {
    // ignore storage failure
  }
}

function resolveSessionId(agentSlug: string | undefined): string {
  const storedSessionId = loadStoredSessionId(agentSlug)
  if (storedSessionId) return storedSessionId
  const fallbackSessionId = generateSessionId()
  persistSessionId(agentSlug, fallbackSessionId)
  return fallbackSessionId
}

function toChatMessage(message: ChatHistoryMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'agent' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: message.content }],
  }
}

function getRawMessageText(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim()
}

function sanitizeAssistantReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function normalizeMarkdownListLeadingBullets(text: string): string {
  return text.replace(
    /(^|\n)(\s*(?:[-+*]|\d+[.)])\s+)(?:(?:[•●◦▪▫·◉○◎◇◆◈⬤⚫⚪]|🔘|🟣|🟢|🔵|🟡|🟠|🔴|🟤)(?:\uFE0F)?\s*)+/g,
    '$1$2'
  )
}

function getRenderableMessageText(message: ChatMessage): string {
  const text = getRawMessageText(message)
  if (!text) return ''
  if (message.role !== 'assistant') return text
  return sanitizeAssistantReasoning(text)
}

function hasRenderableAssistantText(message: ChatMessage): boolean {
  return getRenderableMessageText(message).length > 0
}

function normalizeSessionSummary(value: unknown): ChatSessionSummary | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<ChatSessionSummary>
  if (typeof payload.sessionId !== 'string' || !payload.sessionId.trim()) return null

  const lastMessageAt = typeof payload.lastMessageAt === 'number' && Number.isFinite(payload.lastMessageAt)
    ? payload.lastMessageAt
    : 0
  const messageCount = typeof payload.messageCount === 'number' && Number.isFinite(payload.messageCount)
    ? payload.messageCount
    : 0
  const lastMessagePreview = typeof payload.lastMessagePreview === 'string' && payload.lastMessagePreview.trim()
    ? payload.lastMessagePreview.trim()
    : undefined

  return {
    sessionId: payload.sessionId,
    lastMessageAt,
    messageCount,
    lastMessagePreview,
  }
}

export function ChatPanel() {
  const { t } = useTranslation()
  const { currentAgent } = useChatStore()
  const agentSlug = currentAgent?.slug
  const [input, setInput] = useState('')
  const [runEvents, setRunEvents] = useState<RunEvent[]>([])
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [sessionId, setSessionId] = useState(() => resolveSessionId(agentSlug))
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const shouldInstantScrollRef = useRef(true)
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

  const reloadSessions = useCallback(async (slug: string, options?: { allowSwitch?: boolean }) => {
    setSessionsLoading(true)
    try {
      const url = new URL(`${API_BASE}/chat/sessions`)
      url.searchParams.set('agentSlug', slug)
      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`sessions request failed: ${response.status}`)
      }

      const payload = await response.json() as ChatSessionsResponse
      const nextSessions = Array.isArray(payload.sessions)
        ? payload.sessions
          .map(normalizeSessionSummary)
          .filter((session): session is ChatSessionSummary => Boolean(session))
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
        : []

      setSessions(nextSessions)

      if (options?.allowSwitch) {
        const storedSessionId = loadStoredSessionId(slug)
        if (storedSessionId && (nextSessions.length === 0 || nextSessions.some((item) => item.sessionId === storedSessionId))) {
          setSessionId(storedSessionId)
          persistSessionId(slug, storedSessionId)
          return
        }

        if (nextSessions[0]) {
          setSessionId(nextSessions[0].sessionId)
          persistSessionId(slug, nextSessions[0].sessionId)
          return
        }

        const freshSessionId = resolveSessionId(slug)
        setSessionId(freshSessionId)
      }
    } catch (reloadError) {
      console.error('Failed to load chat sessions', reloadError)
      setSessions([])
      if (options?.allowSwitch) {
        const fallbackSessionId = resolveSessionId(slug)
        setSessionId(fallbackSessionId)
      }
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  const messages = useMemo(
    () => rawMessages.filter((message) => message.role !== 'system' && (message.role !== 'assistant' || hasRenderableAssistantText(message))),
    [rawMessages]
  )
  const sessionOptions = useMemo(() => {
    if (!sessionId) return sessions
    if (sessions.some((item) => item.sessionId === sessionId)) return sessions
    return [
      {
        sessionId,
        lastMessageAt: 0,
        messageCount: 0,
      },
      ...sessions,
    ]
  }, [sessions, sessionId])
  const selectedSessionSummary = useMemo(
    () => sessionOptions.find((item) => item.sessionId === sessionId),
    [sessionOptions, sessionId]
  )
  const recentRunEvents = useMemo(() => runEvents.slice(-4), [runEvents])
  const latestRunEvent = recentRunEvents[recentRunEvents.length - 1]
  const isBusy = sessionsLoading || historyLoading || status === 'streaming' || status === 'submitted'

  useEffect(() => {
    setInput('')
    setRunEvents([])
    setMessages([])
    shouldInstantScrollRef.current = true

    if (!agentSlug) {
      setSessions([])
      setSessionId(generateSessionId())
      return
    }

    void reloadSessions(agentSlug, { allowSwitch: true })
  }, [agentSlug, reloadSessions, setMessages])

  useEffect(() => {
    if (!agentSlug || !sessionId) {
      setMessages([])
      setHistoryLoading(false)
      return
    }

    shouldInstantScrollRef.current = true
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
    if (shouldInstantScrollRef.current) {
      const container = messagesContainerRef.current
      if (container) {
        const previousScrollBehavior = container.style.scrollBehavior
        container.style.scrollBehavior = 'auto'
        container.scrollTop = container.scrollHeight
        container.style.scrollBehavior = previousScrollBehavior
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
    }

    shouldInstantScrollRef.current = false
  }, [messages])

  const handleCreateSession = () => {
    shouldInstantScrollRef.current = true
    const nextSessionId = generateSessionId()
    setSessionId(nextSessionId)
    persistSessionId(agentSlug, nextSessionId)
    setInput('')
    setRunEvents([])
    setMessages([])
    setSessions((previous) => [
      {
        sessionId: nextSessionId,
        lastMessageAt: 0,
        messageCount: 0,
      },
      ...previous.filter((item) => item.sessionId !== nextSessionId),
    ])
  }

  const handleSwitchSession = (nextSessionId: string) => {
    if (!nextSessionId || nextSessionId === sessionId) return
    shouldInstantScrollRef.current = true
    setSessionId(nextSessionId)
    persistSessionId(agentSlug, nextSessionId)
    setRunEvents([])
    setInput('')
    setMessages([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentAgent || isBusy) return

    const content = input.trim()
    setInput('')
    setSessions((previous) => {
      const now = Date.now()
      const existing = previous.find((item) => item.sessionId === sessionId)
      return [
        {
          sessionId,
          lastMessageAt: now,
          messageCount: (existing?.messageCount ?? 0) + 1,
          lastMessagePreview: content,
        },
        ...previous.filter((item) => item.sessionId !== sessionId),
      ].slice(0, 30)
    })

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
    } finally {
      if (agentSlug) {
        void reloadSessions(agentSlug)
      }
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
    const text = getRenderableMessageText(message)
    const normalizedText = normalizeMarkdownListLeadingBullets(text)
    return normalizedText || t('chat.unsupportedMessage', '（此消息类型暂不展示）')
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

      <div className="px-5 py-3 border-b border-border/50 bg-muted/20 space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={sessionId}
            onChange={(event) => handleSwitchSession(event.target.value)}
            disabled={isBusy}
            className="h-8 flex-1 rounded-md border border-border/60 bg-background/60 px-2 text-xs text-foreground disabled:opacity-60"
          >
            {sessionOptions.map((session, index) => {
              const timeText = session.lastMessageAt > 0 ? formatEventTime(session.lastMessageAt) : '新会话'
              return (
                <option key={session.sessionId} value={session.sessionId}>
                  {`会话 ${index + 1} · ${timeText}`}
                </option>
              )
            })}
          </select>
          <button
            type="button"
            onClick={handleCreateSession}
            disabled={isBusy}
            className="h-8 rounded-md border border-border/60 px-3 text-xs hover:bg-muted/60 disabled:opacity-60"
          >
            新会话
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {sessionsLoading
            ? '正在刷新会话列表…'
            : selectedSessionSummary?.lastMessagePreview
              ? selectedSessionSummary.lastMessagePreview
              : '当前会话暂无消息'}
        </p>
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

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-5">
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
              <MarkdownRenderer
                className={cn(
                  message.role === 'user'
                    ? 'prose-invert [&_a]:text-white [&_.code-block-wrapper_pre]:bg-black/30 [&_.code-block-wrapper_pre]:border-white/10'
                    : ''
                )}
              >
                {renderMessageText(message)}
              </MarkdownRenderer>
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
            disabled={isBusy}
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
