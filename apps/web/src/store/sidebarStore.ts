import { create } from 'zustand'
import type { ReactNode } from 'react'

// Sidebar content can be a component or null
export type SidebarContent = ReactNode | null

export interface SidebarState {
  // State
  isOpen: boolean
  title: string
  content: SidebarContent
  width: string // e.g., '400px', '50%'
  showOverlay: boolean // Whether to show backdrop on mobile
  
  // Actions
  openSidebar: (options: OpenSidebarOptions) => void
  closeSidebar: () => void
  toggleSidebar: () => void
  setSidebarContent: (content: SidebarContent) => void
  setSidebarTitle: (title: string) => void
}

export interface OpenSidebarOptions {
  title?: string
  content: SidebarContent
  width?: string
  showOverlay?: boolean
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  title: '',
  content: null,
  width: '400px',
  showOverlay: true,
  
  openSidebar: (options) => set({
    isOpen: true,
    title: options.title || '',
    content: options.content,
    width: options.width || '400px',
    showOverlay: options.showOverlay !== false,
  }),
  
  closeSidebar: () => set({ 
    isOpen: false,
    // Keep content for animation, clear after delay if needed
  }),
  
  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
  
  setSidebarContent: (content) => set({ content }),
  
  setSidebarTitle: (title) => set({ title }),
}))

// Helper hook for easy sidebar operations
export function useSidebar() {
  const store = useSidebarStore()
  
  return {
    isOpen: store.isOpen,
    title: store.title,
    content: store.content,
    width: store.width,
    open: store.openSidebar,
    close: store.closeSidebar,
    toggle: store.toggleSidebar,
  }
}
