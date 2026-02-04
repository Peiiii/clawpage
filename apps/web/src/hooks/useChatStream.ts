import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Message } from '@clawpage/shared'
import { useChatStore } from '@/store'
import { streamMessage } from '@/lib/chat-stream'

export function useChatStream(sessionId: string) {
  const { t } = useTranslation()
  const {
    currentAgent,
    isLoading,
    setLoading,
    addMessage,
    appendMessageContent,
    updateMessage,
  } = useChatStore()
  const runIdMap = useRef(new Map<string, string>())
  const runIdCreated = useRef(new Set<string>())

  const formatErrorMessage = useCallback((raw?: string) => {
    if (!raw) {
      return t('chat.error.generic', '连接失败，请稍后再试。')
    }
    const normalized = raw.toLowerCase()
    if (normalized.includes('connector offline')) {
      return t('chat.error.connectorOffline', 'Claw 未在线：请确保你的 Claw 正在运行并已连接 ClawBay 通道。')
    }
    if (normalized.includes('gateway not configured')) {
      return t('chat.error.gatewayMissing', 'Claw 尚未完成对话连接，请让 Claw 按照 skill.md 完成连接。')
    }
    return t('chat.error.genericWithDetail', '连接失败：{{error}}', { error: raw })
  }, [t])

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
          },
          onDelta: ({ runId, delta }) => {
            const messageId = runIdMap.current.get(runId)
            if (!messageId) return
            if (!runIdCreated.current.has(runId) && currentAgent) {
              addMessage({
                id: messageId,
                agentId: currentAgent.id,
                sessionId,
                role: 'agent',
                content: '',
                status: 'pending',
                createdAt: Date.now(),
              })
              runIdCreated.current.add(runId)
            }
            appendMessageContent(messageId, delta)
          },
          onFinal: ({ runId, content: finalContent }) => {
            const messageId = runIdMap.current.get(runId)
            if (messageId && currentAgent) {
              if (runIdCreated.current.has(runId)) {
                updateMessage(messageId, {
                  content: finalContent,
                  status: 'delivered',
                })
              } else {
                addMessage({
                  id: messageId,
                  agentId: currentAgent.id,
                  sessionId,
                  role: 'agent',
                  content: finalContent,
                  status: 'delivered',
                  createdAt: Date.now(),
                })
                runIdCreated.current.add(runId)
              }
            }
            runIdMap.current.delete(runId)
            runIdCreated.current.delete(runId)
            setLoading(false)
          },
          onError: ({ runId, error }) => {
            const errorMessage = formatErrorMessage(error)
            const messageId = runIdMap.current.get(runId)
            if (messageId) {
              if (runIdCreated.current.has(runId)) {
                updateMessage(messageId, {
                  content: errorMessage,
                  status: 'failed',
                })
              } else if (currentAgent) {
                addMessage({
                  id: messageId,
                  agentId: currentAgent.id,
                  sessionId,
                  role: 'agent',
                  content: errorMessage,
                  status: 'failed',
                  createdAt: Date.now(),
                })
              }
            } else if (currentAgent) {
              addMessage({
                id: crypto.randomUUID(),
                agentId: currentAgent.id,
                sessionId,
                role: 'agent',
                content: errorMessage,
                status: 'failed',
                createdAt: Date.now(),
              })
            }
            runIdMap.current.delete(runId)
            runIdCreated.current.delete(runId)
            setLoading(false)
          },
        },
      })
    } catch {
      setLoading(false)
    }
  }, [addMessage, appendMessageContent, currentAgent, formatErrorMessage, isLoading, sessionId, setLoading, updateMessage])

  return { sendMessage }
}
