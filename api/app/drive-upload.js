import { requireSession } from '../_lib/auth.js'
import { ensureSchema, getDb, createId, nowIso } from '../_lib/db.js'
import { getBootstrapData } from '../_lib/app-data.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'
const PROJECT_DRIVE_MAX_FILE_BYTES = 50 * 1024 * 1024

function normalizeText(value) {
  return String(value ?? '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const body = await readJsonBody(req)
    const projectId = normalizeText(body.projectId)
    const subprojectId = normalizeText(body.subprojectId) || null
    const filename = normalizeText(body.filename)
    const contentType = normalizeText(body.contentType) || null
    const blobUrl = normalizeText(body.blobUrl)
    const blobPathname = normalizeText(body.blobPathname)
    const sizeBytes = Number(body.sizeBytes)

    if (!projectId) return json(res, 400, { error: 'projectId é obrigatório' })
    if (!filename) return json(res, 400, { error: 'filename é obrigatório' })
    if (!blobUrl) return json(res, 400, { error: 'blobUrl é obrigatório' })
    if (!blobPathname) return json(res, 400, { error: 'blobPathname é obrigatório' })
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return json(res, 400, { error: 'sizeBytes inválido' })
    if (sizeBytes > PROJECT_DRIVE_MAX_FILE_BYTES) return json(res, 400, { error: 'Arquivo muito grande. Máximo: 50 MB' })

    await ensureSchema()
    const db = getDb()
    const projectResult = await db.execute({
      sql: 'SELECT id, drive_enabled FROM projects WHERE id = ? LIMIT 1',
      args: [projectId],
    })
    const project = projectResult.rows[0]
    if (!project) return json(res, 404, { error: 'Projeto não encontrado' })
    if (!Number(project.drive_enabled)) return json(res, 400, { error: 'Drive do projeto está desativado' })

    if (subprojectId) {
      const subprojectResult = await db.execute({
        sql: 'SELECT id FROM subprojects WHERE id = ? AND project_id = ? LIMIT 1',
        args: [subprojectId, projectId],
      })
      if (!subprojectResult.rows[0]) return json(res, 404, { error: 'Subprojeto não encontrado' })
    }

    const existingFileResult = await db.execute({
      sql: 'SELECT id FROM project_drive_files WHERE blob_pathname = ? LIMIT 1',
      args: [blobPathname],
    })

    if (!existingFileResult.rows[0]) {
      const createdAt = nowIso()
      await db.execute({
        sql: `INSERT INTO project_drive_files (
          id, project_id, subproject_id, filename, blob_url, blob_pathname, content_type, size_bytes, uploaded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('pdf'),
          projectId,
          subprojectId,
          filename,
          blobUrl,
          blobPathname,
          contentType,
          sizeBytes,
          user.email,
          createdAt,
        ],
      })
    }

    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Falha no upload do arquivo' })
  }
}
