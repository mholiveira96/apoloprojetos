import { handleUpload } from '@vercel/blob/client'
import { requireSession } from '../_lib/auth.js'
import { ensureSchema, getDb } from '../_lib/db.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

const PROJECT_DRIVE_MAX_FILE_BYTES = 50 * 1024 * 1024

function normalizeText(value) {
  return String(value ?? '').trim()
}

function sanitizeSegment(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseClientPayload(rawPayload) {
  try {
    const parsed = JSON.parse(rawPayload || '{}')
    return {
      projectId: normalizeText(parsed.projectId),
      subprojectId: normalizeText(parsed.subprojectId) || null,
      filename: normalizeText(parsed.filename),
      contentType: normalizeText(parsed.contentType) || null,
    }
  } catch {
    return {
      projectId: '',
      subprojectId: null,
      filename: '',
      contentType: null,
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const body = await readJsonBody(req)
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload)
        if (!payload.projectId) throw new Error('projectId é obrigatório')
        if (!payload.filename) throw new Error('filename é obrigatório')

        const safeProjectId = sanitizeSegment(payload.projectId)
        const safeSubprojectId = sanitizeSegment(payload.subprojectId || '')
        const safeFilename = sanitizeSegment(payload.filename)
        const expectedPrefix = safeSubprojectId
          ? `apolo/project-drive/${safeProjectId}/${safeSubprojectId}/`
          : `apolo/project-drive/${safeProjectId}/`

        if (!pathname.startsWith(expectedPrefix) || !pathname.endsWith(safeFilename)) {
          throw new Error('Path de upload inválido')
        }

        await ensureSchema()
        const db = getDb()
        const projectResult = await db.execute({
          sql: 'SELECT id, drive_enabled FROM projects WHERE id = ? LIMIT 1',
          args: [payload.projectId],
        })
        const project = projectResult.rows[0]
        if (!project) throw new Error('Projeto não encontrado')
        if (!Number(project.drive_enabled)) throw new Error('Drive do projeto está desativado')

        if (payload.subprojectId) {
          const subprojectResult = await db.execute({
            sql: 'SELECT id FROM subprojects WHERE id = ? AND project_id = ? LIMIT 1',
            args: [payload.subprojectId, payload.projectId],
          })
          if (!subprojectResult.rows[0]) throw new Error('Subprojeto não encontrado')
        }

        return {
          maximumSizeInBytes: PROJECT_DRIVE_MAX_FILE_BYTES,
          allowedContentTypes: payload.contentType ? [payload.contentType] : undefined,
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
    })

    return json(res, 200, result)
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : 'Falha ao autorizar upload do arquivo' })
  }
}
