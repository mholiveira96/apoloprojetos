import { requireSession } from '../_lib/auth'
import { getBootstrapData } from '../_lib/app-data'
import { json, methodNotAllowed, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http'
import { runMutation } from '../_lib/mutations'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const body = await readJsonBody(req)
    await runMutation(body.action, body.payload || {}, user.email)
    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Mutation failed' })
  }
}
