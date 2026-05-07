import { requireSession } from '../_lib/auth.js'
import { getBootstrapData } from '../_lib/app-data.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'
import { runMutation } from '../_lib/mutations.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const body = await readJsonBody(req)
    const action = typeof body.action === 'string' ? body.action : ''
    const payload = typeof body.payload === 'object' && body.payload !== null ? body.payload : {}
    await runMutation(action, payload, user.email)
    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Mutation failed' })
  }
}
