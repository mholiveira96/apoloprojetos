import { requireSession } from '../_lib/auth.js'
import { ensureSchema, getDb } from '../_lib/db.js'
import { getBootstrapData } from '../_lib/app-data.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'
import { deleteProjectDriveBlob } from '../_lib/project-drive.js'

function normalizeText(value) {
  return String(value ?? '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const body = await readJsonBody(req)
    const fileId = normalizeText(body.fileId)
    if (!fileId) return json(res, 400, { error: 'fileId é obrigatório' })

    await ensureSchema()
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT id, blob_url, blob_pathname FROM project_drive_files WHERE id = ? LIMIT 1',
      args: [fileId],
    })
    const file = result.rows[0]
    if (!file) return json(res, 404, { error: 'Arquivo não encontrado' })

    await deleteProjectDriveBlob(String(file.blob_pathname || file.blob_url))
    await db.execute({
      sql: 'DELETE FROM project_drive_files WHERE id = ?',
      args: [fileId],
    })

    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Falha ao excluir arquivo' })
  }
}
