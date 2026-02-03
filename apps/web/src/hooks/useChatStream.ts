import { useCallback, useRef } from 'react'
import type { Message } from '@clawpage/shared'
import { useChatStore } from '@/store'
import { streamMessage } from '@/lib/chat-stream'

export function useChatStream(sessionId: string) {
  const {
    currentAgent,
    isLoading,
    setLoading,
    addMessage,
    appendMessageContent,
    updateMessage,
  } = useChatStore()
  const runIdMap = useRef(new Map<string, string>())

  const sendMessage = useCallback(async (content: string) => {
    if (!currentAgent || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      agentId: currentAgent.id,
      sessionId,
      role: 'user',
      content,
      status: 'sent',
      createdAt: Date.now(),
    }
    addMessage(userMessage)
    setLoading(true)

    try {
      await streamMessage({
        agentSlug: currentAgent.slug,
        sessionId,
        content,
        handlers: {
          onAck: ({ runId }) => {
            const agentMessageId = `stream-${runId}`
            runIdMap.current.set(runId, agentMessageId)
            addMessage({
              id: agentMessageId,
              agentId: currentAgent.id,
              sessionId,
              role: 'agent',
              content: '',
              status: 'pending',
              createdAt: Date.now(),
            })
          },
          onDelta: ({ runId, delta }) => {
            const messageId = runIdMap.current.get(runId)
            if (!messageId) return
            appendMessageContent(messageId, delta)
          },
          onFinal: ({ runId, content: finalContent }) => {
            const messageId = runIdMap.current.get(runId)
            if (messageId) {
              updateMessage(messageId, {
                content: finalContent,
                status: 'delivered',
              })
            }
            runIdMap.current.delete(runId)
            setLoading(false)
          },
          onError: ({ runId }) => {
            const messageId = runIdMap.current.get(runId)
            if (messageId) {
              updateMessage(messageId, {
                status: 'failed',
              })
            }
            runIdMap.current.delete(runId)
            setLoading(false)
          },
        },
      })
    } catch {
      setLoading(false)
    }
  }, [addMessage, appendMessageContent, currentAgent, isLoading, sessionId, setLoading, updateMessage])

  return { sendMessage }
}
