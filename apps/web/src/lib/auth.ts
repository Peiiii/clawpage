import { API_BASE } from './api'

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  avatarUrl?: string | null
  createdAt: number
  lastLoginAt?: number | null
  sessionExpiresAt: number
}

export type AuthMeResponse = {
  authenticated: boolean
  user?: AuthUser
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`auth_me_failed_${response.status}`)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`logout_failed_${response.status}`)
  }
}

export function getGoogleLoginUrl(returnTo?: string): string {
  const target = returnTo || (typeof window !== 'undefined' ? window.location.href : 'https://clawbay.ai/')
  const url = new URL(`${API_BASE}/auth/google/start`)
  url.searchParams.set('returnTo', target)
  return url.toString()
}
