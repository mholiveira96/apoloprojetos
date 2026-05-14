import { requireSession } from '../_lib/auth.js'
import { ensureSchema, getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const user = requireSession(req, res)
  if (!user) return

  const url = new URL(req.url, 'http://localhost')
  const leadId = url.searchParams.get('leadId')

  if (!leadId) return json(res, 400, { error: 'leadId é obrigatório' })

  try {
    await ensureSchema()
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT filename, file_data FROM lead_proposals WHERE lead_id = ? LIMIT 1',
      args: [leadId],
    })

    if (!result.rows[0]) return json(res, 404, { error: 'Proposta não encontrada' })

    const filename = String(result.rows[0].filename)
    const fileData = String(result.rows[0].file_data)
    const buffer = Buffer.from(fileData, 'base64')

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', buffer.length)
    res.end(buffer)
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Falha ao buscar proposta' })
  }
}
