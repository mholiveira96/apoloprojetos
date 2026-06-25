import path from 'node:path'
import { put, del } from '@vercel/blob'

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('Missing BLOB_READ_WRITE_TOKEN')
  return token
}

function getBlobStoreId() {
  return process.env.BLOBPUBLIC_STORE_ID || process.env.BLOB_STORE_ID || undefined
}

function sanitizeSegment(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildProjectDrivePath({ projectId, subprojectId, filename }) {
  const safeName = sanitizeSegment(path.basename(filename || 'arquivo')) || 'arquivo'
  const safeProjectId = sanitizeSegment(projectId) || 'projeto'
  const safeSubprojectId = sanitizeSegment(subprojectId || '')
  const stamp = Date.now()
  const parts = ['apolo', 'project-drive', safeProjectId]
  if (safeSubprojectId) parts.push(safeSubprojectId)
  parts.push(`${stamp}-${safeName}`)
  return parts.join('/')
}

export async function uploadProjectDriveBlob({ projectId, subprojectId, filename, contentType, buffer }) {
  const pathname = buildProjectDrivePath({ projectId, subprojectId, filename })
  return put(pathname, buffer, {
    access: 'public',
    token: getBlobToken(),
    storeId: getBlobStoreId(),
    addRandomSuffix: false,
    contentType: contentType || undefined,
    allowOverwrite: false,
  })
}

export async function deleteProjectDriveBlob(urlOrPathname) {
  return del(urlOrPathname, {
    token: getBlobToken(),
    storeId: getBlobStoreId(),
  })
}
