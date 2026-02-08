import { create } from 'zustand'
import type { Agent } from '@clawpage/shared'
import { useSidebarStore } from './sidebarStore'
import type { ReactNode } from 'react'

// Chat Store
interface ChatState {
  currentAgent: Agent | null
  setCurrentAgent: (agent: Agent | null) => void
  // Legacy API - now uses global sidebar
  openChat: (agent: Agent, chatPanelComponent: ReactNode) => void
  closeChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  currentAgent: null,
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  
  // Open chat in global sidebar
  openChat: (agent, chatPanelComponent) => {
    set({ currentAgent: agent })
    useSidebarStore.getState().openSidebar({
      title: agent.name,
      content: chatPanelComponent,
      width: '400px',
    })
  },
  
  // Close chat via global sidebar
  closeChat: () => {
    useSidebarStore.getState().closeSidebar()
  },
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
