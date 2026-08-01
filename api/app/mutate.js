import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { requireSession } from '../_lib/auth.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function loadMutations() {
  const mutationsPath = path.resolve(__dirname, '../_lib/mutations.js')
  const mtime = await fs.stat(mutationsPath).then((stat) => stat.mtimeMs)
  return import(`${pathToFileURL(mutationsPath).href}?t=${mtime}`)
}

async function loadAppData() {
  const appDataPath = path.resolve(__dirname, '../_lib/app-data.js')
  const mtime = await fs.stat(appDataPath).then((stat) => stat.mtimeMs)
  return import(`${pathToFileURL(appDataPath).href}?t=${mtime}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  try {
    const body = await readJsonBody(req)
    const action = typeof body?.action === 'string' ? body.action : ''
    const payload = typeof body?.payload === 'object' && body.payload !== null ? body.payload : {}
    const isPublicQuestionnaire = action === 'savePremiseQuestionnaire' && body?.public === true

    let user = null
    if (!isPublicQuestionnaire) {
      user = requireSession(req, res)
      if (!user) return
    }

    const { runMutation } = await loadMutations()
    await runMutation(action, payload, isPublicQuestionnaire ? 'public-questionnaire' : user.email)

    // Public questionnaire submissions may create a record, but can never read it back.
    if (isPublicQuestionnaire) return json(res, 201, { ok: true })

    const { getBootstrapData } = await loadAppData()
    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Mutation failed' })
  }
}
