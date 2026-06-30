import { ensureSchema, getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/http.js'

function normalizeText(value) {
  return String(value ?? '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  try {
    const url = new URL(req.url, 'http://localhost')
    const token = normalizeText(url.searchParams.get('token'))
    if (!token) return json(res, 400, { error: 'token é obrigatório' })

    await ensureSchema()
    const db = getDb()

    const projectResult = await db.execute({
      sql: `SELECT
              projects.id,
              projects.name,
              clients.name AS client_name,
              projects.drive_enabled,
              projects.drive_token,
              projects.drive_updated_at
            FROM projects
            LEFT JOIN clients ON clients.id = projects.client_id
            WHERE projects.drive_token = ?
            LIMIT 1`,
      args: [token],
    })

    const project = projectResult.rows[0]
    if (!project || !Number(project.drive_enabled)) {
      return json(res, 404, { error: 'Drive não encontrado ou indisponível' })
    }

    const filesResult = await db.execute({
      sql: `SELECT
              project_drive_files.id,
              project_drive_files.project_id,
              project_drive_files.subproject_id,
              project_drive_files.filename,
              project_drive_files.blob_url,
              project_drive_files.blob_pathname,
              project_drive_files.content_type,
              project_drive_files.size_bytes,
              project_drive_files.uploaded_by,
              project_drive_files.created_at,
              projects.name AS project_name,
              subprojects.discipline AS subproject_discipline
            FROM project_drive_files
            INNER JOIN projects ON projects.id = project_drive_files.project_id
            LEFT JOIN subprojects ON subprojects.id = project_drive_files.subproject_id
            WHERE project_drive_files.project_id = ?
            ORDER BY project_drive_files.created_at DESC`,
      args: [project.id],
    })

    return json(res, 200, {
      project: {
        id: String(project.id),
        name: String(project.name),
        client_name: project.client_name ? String(project.client_name) : null,
        drive_updated_at: project.drive_updated_at ? String(project.drive_updated_at) : null,
      },
      files: filesResult.rows,
    })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Falha ao carregar drive público' })
  }
}
