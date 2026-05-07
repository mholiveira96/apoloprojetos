import type { BootstrapData, SessionUser } from '@/types/app'

type JsonResult<T> = Promise<T>

async function request<T>(input: RequestInfo, init?: RequestInit): JsonResult<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data as T
}

export function getSession() {
  return request<{ user: SessionUser | null }>('/api/auth/session', { method: 'GET' })
}

export function login(email: string, password: string) {
  return request<{ user: SessionUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) })
}

export function getBootstrap() {
  return request<BootstrapData>('/api/app/bootstrap', { method: 'GET' })
}

export function mutate(action: string, payload: Record<string, unknown>) {
  return request<BootstrapData>('/api/app/mutate', {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
  })
}
