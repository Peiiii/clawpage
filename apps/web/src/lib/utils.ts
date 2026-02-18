import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一的 session ID
export function generateSessionId(): string {
  const stored = localStorage.getItem('clawbay_session_id')
  if (stored) return stored

  const id = crypto.randomUUID()
  localStorage.setItem('clawbay_session_id', id)
  return id
}

// 格式化时间（支持 i18n）
export function formatTime(timestamp: number, t?: (key: string, opts?: Record<string, unknown>) => string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (t) {
    if (minutes < 1) return t('time.justNow')
    if (minutes < 60) return t('time.minutesAgo', { count: minutes })
    if (hours < 24) return t('time.hoursAgo', { count: hours })
    if (days < 7) return t('time.daysAgo', { count: days })
  } else {
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
  }

  return date.toLocaleDateString()
}
