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
    const driveToken = normalizeText(url.searchParams.get('token'))
    if (!fileId || !driveToken) return json(res, 400, { error: 'fileId e token são obrigatórios' })

    await ensureSchema()
    const db = getDb()

    // Verify the drive token matches the project and drive is enabled
    const result = await db.execute({
      sql: `SELECT pdf.blob_url, pdf.filename, pdf.content_type
            FROM project_drive_files pdf
            INNER JOIN projects p ON p.id = pdf.project_id
            WHERE pdf.id = ? AND p.drive_token = ? AND p.drive_enabled = 1
            LIMIT 1`,
      args: [fileId, driveToken],
    })
    const fileRow = result.rows[0]
    if (!fileRow) return json(res, 404, { error: 'Arquivo não encontrado ou drive inativo' })

    const blobUrl = String(fileRow.blob_url || '')

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
      // Blob might be public
    }

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
