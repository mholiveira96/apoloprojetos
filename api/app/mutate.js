import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { requireSession } from '../_lib/auth.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const body = await readJsonBody(req)
    const action = typeof body.action === 'string' ? body.action : ''
    const payload = typeof body.payload === 'object' && body.payload !== null ? body.payload : {}

    const mutationsPath = path.resolve(__dirname, '../_lib/mutations.js')
    const appDataPath = path.resolve(__dirname, '../_lib/app-data.js')
    const [mutationsMtime, appDataMtime] = await Promise.all([
      fs.stat(mutationsPath).then((s) => s.mtimeMs),
      fs.stat(appDataPath).then((s) => s.mtimeMs),
    ])
    const [{ runMutation }, { getBootstrapData }] = await Promise.all([
      import(`${pathToFileURL(mutationsPath).href}?t=${mutationsMtime}`),
      import(`${pathToFileURL(appDataPath).href}?t=${appDataMtime}`),
    ])

    await runMutation(action, payload, user.email)
    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Mutation failed' })
  }
}
