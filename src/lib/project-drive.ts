import type { Project, ProjectDriveFile } from '@/types/app'

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

export function slugifyProjectDriveSegment(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseProjectDriveToken(pathParam: string | null | undefined) {
  const value = normalizeText(pathParam)
  if (!value) return ''
  const separatorIndex = value.lastIndexOf('--')
  if (separatorIndex === -1) return value
  return value.slice(separatorIndex + 2)
}

export function buildProjectDrivePath(project: Pick<Project, 'code' | 'name' | 'drive_token'>) {
  const token = normalizeText(project.drive_token)
  if (!token) return ''

  const label = [project.code, project.name]
    .map((part) => slugifyProjectDriveSegment(part))
    .filter(Boolean)
    .join('-')

  return label ? `/drive/${label}--${token}` : `/drive/${token}`
}

export function buildProjectDriveUrl(project: Pick<Project, 'code' | 'name' | 'drive_token'>, origin: string) {
  const path = buildProjectDrivePath(project)
  return path ? `${origin}${path}` : ''
}

export function isPdfProjectDriveFile(file: Pick<ProjectDriveFile, 'content_type' | 'filename'>) {
  const contentType = normalizeText(file.content_type).toLowerCase()
  const filename = normalizeText(file.filename).toLowerCase()
  return contentType.includes('pdf') || filename.endsWith('.pdf')
}
