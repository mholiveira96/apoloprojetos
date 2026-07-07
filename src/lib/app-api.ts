import { upload } from '@vercel/blob/client'
import type { BootstrapData, SessionUser } from '@/types/app'

type JsonResult<T> = Promise<T>

type ProjectDriveUploadInput = {
  projectId: string
  subprojectId?: string | null
  file: File
}

export const PROJECT_DRIVE_MAX_FILE_BYTES = 50 * 1024 * 1024

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function sanitizeUploadPathSegment(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildProjectDriveUploadPath(projectId: string, subprojectId: string | null | undefined, filename: string) {
  const safeName = sanitizeUploadPathSegment(filename) || 'arquivo'
  const safeProjectId = sanitizeUploadPathSegment(projectId) || 'projeto'
  const safeSubprojectId = sanitizeUploadPathSegment(subprojectId || '')
  const stamp = Date.now()
  const parts = ['apolo', 'project-drive', safeProjectId]
  if (safeSubprojectId) parts.push(safeSubprojectId)
  parts.push(`${stamp}-${safeName}`)
  return parts.join('/')
}

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
    throw new Error(data.error || 'Requisição falhou')
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

export async function uploadProjectDriveFile(payload: ProjectDriveUploadInput) {
  const pathname = buildProjectDriveUploadPath(payload.projectId, payload.subprojectId, payload.file.name)
  const blob = await upload(pathname, payload.file, {
    access: 'public',
    handleUploadUrl: '/api/app/drive-upload-token',
    contentType: payload.file.type || undefined,
    clientPayload: JSON.stringify({
      projectId: payload.projectId,
      subprojectId: payload.subprojectId ?? null,
      filename: payload.file.name,
      contentType: payload.file.type || null,
    }),
    multipart: payload.file.size > 20 * 1024 * 1024,
  })

  return request<BootstrapData>('/api/app/drive-upload', {
    method: 'POST',
    body: JSON.stringify({
      projectId: payload.projectId,
      subprojectId: payload.subprojectId ?? null,
      filename: payload.file.name,
      contentType: blob.contentType || payload.file.type || null,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      sizeBytes: payload.file.size,
    }),
  })
}

export function deleteProjectDriveFile(fileId: string) {
  return request<BootstrapData>('/api/app/drive-delete', {
    method: 'POST',
    body: JSON.stringify({ fileId }),
  })
}
