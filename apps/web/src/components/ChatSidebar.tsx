import { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, User, Sparkles } from 'lucide-react'
import { useChatStore } from '@/store'
import { fetchMessages, sendMessage } from '@/lib/api'
import { generateSessionId, cn } from '@/lib/utils'
import type { Message } from '@clawpage/shared'

export function ChatSidebar() {
  const { isOpen, closeChat, currentAgent, messages, setMessages, addMessage, isLoading, setLoading } = useChatStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionId = generateSessionId()

  // Load messages when agent changes
  useEffect(() => {
    if (currentAgent && isOpen) {
      fetchMessages(currentAgent.slug, sessionId).then((data) => {
        setMessages(data.items)
      })
    }
  }, [currentAgent, isOpen, sessionId, setMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentAgent || isLoading) return

    const content = input.trim()
    setInput('')
    setLoading(true)

    // Optimistic update
    const tempMessage: Message = {
      id: crypto.randomUUID(),
      agentId: currentAgent.id,
      sessionId,
      role: 'user',
      content,
      status: 'sent',
      createdAt: Date.now(),
    }
    addMessage(tempMessage)

    try {
      const response = await sendMessage(currentAgent.slug, sessionId, content)
      
      if (response.success) {
        let attempts = 0
        const pollInterval = setInterval(async () => {
          attempts++
          if (attempts > 10) {
            clearInterval(pollInterval)
            addMockAgentResponse()
            setLoading(false)
            return
          }
          
          const data = await fetchMessages(currentAgent.slug, sessionId)
          const latestMessages = data.items
          if (latestMessages.length > messages.length + 1) {
            setMessages(latestMessages)
            clearInterval(pollInterval)
            setLoading(false)
          }
        }, 1000)
      }
    } catch {
      addMockAgentResponse()
    }
    
    function addMockAgentResponse() {
      setTimeout(() => {
        const mockResponses = [
          `你好！我是 ${currentAgent?.name}，很高兴收到你的消息。有什么我可以帮助你的吗？`,
          `感谢你的问题！让我来帮你解答...`,
          `这是一个很好的想法！我来详细说明一下...`,
          `我理解你的意思了。根据我的分析...`,
          `收到！让我来处理这个请求...`,
        ]
        const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]
        
        const agentMessage: Message = {
          id: crypto.randomUUID(),
          agentId: currentAgent?.id || '',
          sessionId,
          role: 'agent',
          content: randomResponse,
          status: 'sent',
          createdAt: Date.now(),
        }
        addMessage(agentMessage)
        setLoading(false)
      }, 1000 + Math.random() * 1000)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={closeChat}
      />

      {/* Sidebar */}
      <aside className="chat-sidebar open w-full sm:w-[420px] lg:w-[400px] bg-background/95 backdrop-blur-xl border-l border-border/50 flex flex-col shadow-2xl shadow-black/20">
        {/* Header with gradient border */}
        <header className="relative flex items-center justify-between p-5 border-b border-border/50">
          {/* Gradient line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden ring-2 ring-purple-500/20">
                {currentAgent?.avatarUrl ? (
                  <img src={currentAgent.avatarUrl} alt={currentAgent.name} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-6 h-6 text-white" />
                )}
              </div>
              {/* Online status */}
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
          <button
            onClick={closeChat}
            className="p-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Bot className="w-10 h-10 text-purple-400" />
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
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
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
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border border-border/50">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input with gradient border */}
        <form onSubmit={handleSubmit} className="relative p-5 border-t border-border/50">
          {/* Gradient line at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 h-12 rounded-xl border border-border/50 bg-muted/50 backdrop-blur-sm px-4 text-sm outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-muted-foreground hover:border-purple-500/30"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center hover:opacity-90 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
