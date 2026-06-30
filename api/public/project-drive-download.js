import { ensureSchema, getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/http.js'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function buildAttachmentDisposition(filename) {
  const safeFilename = normalizeText(filename) || 'arquivo'
  const asciiFallback = safeFilename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'arquivo'
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
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
    const filename = normalizeText(fileRow.filename) || 'arquivo'
    if (!blobUrl) return json(res, 404, { error: 'URL do arquivo não encontrada' })

    const upstream = await fetch(blobUrl)
    if (!upstream.ok) {
      return json(res, 502, { error: 'Falha ao buscar arquivo para download' })
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    const contentType = normalizeText(fileRow.content_type) || upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')

    res.statusCode = 200
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', buildAttachmentDisposition(filename))
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')
    if (contentLength) res.setHeader('Content-Length', contentLength)
    res.end(buffer)
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Falha no download' })
  }
}
