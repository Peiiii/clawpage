import { create } from 'zustand'
import type { Agent, Message } from '@clawpage/shared'

// Chat Store
interface ChatState {
  isOpen: boolean
  currentAgent: Agent | null
  messages: Message[]
  isLoading: boolean
  openChat: (agent: Agent) => void
  closeChat: () => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  currentAgent: null,
  messages: [],
  isLoading: false,
  openChat: (agent) => set({ isOpen: true, currentAgent: agent, messages: [] }),
  closeChat: () => set({ isOpen: false, currentAgent: null, messages: [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
}))

// UI Store
interface UIState {
  searchQuery: string
  selectedTag: string | null
  setSearchQuery: (query: string) => void
  setSelectedTag: (tag: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  selectedTag: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedTag: (selectedTag) => set({ selectedTag }),
}))
