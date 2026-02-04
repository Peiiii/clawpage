import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { useChatStore } from '@/store'
import { fetchMessages } from '@/lib/api'
import { generateSessionId, cn } from '@/lib/utils'
import { useChatStream } from '@/hooks/useChatStream'

export function ChatPanel() {
  const { currentAgent, messages, setMessages, isLoading } = useChatStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionId = generateSessionId()
  const { sendMessage } = useChatStream(sessionId)
  const hasPendingAgent = messages.some((message) => message.role === 'agent' && message.status === 'pending')

  // Load messages when agent changes
  useEffect(() => {
    if (currentAgent) {
      fetchMessages(currentAgent.slug, sessionId).then((data) => {
        setMessages(data.items)
      })
    }
  }, [currentAgent, sessionId, setMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentAgent || isLoading) return

    const content = input.trim()
    setInput('')
    try {
      await sendMessage(content)
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

  return (
    <div className="flex flex-col h-full">
      {/* Agent Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center overflow-hidden ring-2 ring-pink-500/20">
            {currentAgent?.avatarUrl ? (
              <img src={currentAgent.avatarUrl} alt={currentAgent.name} className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-base">{currentAgent?.name}</h3>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            在线 · 立即回复
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-pink-400" />
            </div>
            <h4 className="font-semibold mb-1">开始和 {currentAgent?.name} 对话</h4>
            <p className="text-sm text-muted-foreground max-w-[240px]">
              发送消息开始对话，AI 会立即回复你
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && !hasPendingAgent && (
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="w-full h-11 pl-4 pr-12 rounded-xl bg-muted/50 border border-border/50 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-pink-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
