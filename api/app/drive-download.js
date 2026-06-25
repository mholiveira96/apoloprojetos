import { head } from '@vercel/blob'
import { ensureSchema, getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/http.js'

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('Missing BLOB_READ_WRITE_TOKEN')
  return token
}

function getBlobStoreId() {
  return process.env.BLOB_STORE_ID || undefined
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  try {
    const url = new URL(req.url, 'http://localhost')
    const fileId = normalizeText(url.searchParams.get('fileId'))
    if (!fileId) return json(res, 400, { error: 'fileId é obrigatório' })

    await ensureSchema()
    const db = getDb()

    const result = await db.execute({
      sql: 'SELECT blob_url, blob_pathname, filename, content_type FROM project_drive_files WHERE id = ? LIMIT 1',
      args: [fileId],
    })
    const fileRow = result.rows[0]
    if (!fileRow) return json(res, 404, { error: 'Arquivo não encontrado' })

    const blobUrl = String(fileRow.blob_url || '')

    // Try to get a downloadable URL via the Blob API
    try {
      const headResult = await head(blobUrl, {
        token: getBlobToken(),
        storeId: getBlobStoreId(),
      })

      if (headResult.downloadUrl) {
        res.writeHead(302, { Location: headResult.downloadUrl })
        res.end()
        return
      }
    } catch {
      // Blob might be public, try direct URL
    }

    // Fallback: redirect to the blob URL (works if store is public)
    if (blobUrl) {
      res.writeHead(302, { Location: blobUrl })
      res.end()
      return
    }

    return json(res, 404, { error: 'URL do arquivo não encontrada' })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Falha no download' })
  }
}
