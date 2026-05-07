import { requireSession } from '../_lib/auth.js'
import { getBootstrapData } from '../_lib/app-data.js'
import { json, methodNotAllowed } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const user = requireSession(req, res)
  if (!user) return

  try {
    const data = await getBootstrapData()
    return json(res, 200, { user, ...data })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Failed to load app data' })
  }
}
