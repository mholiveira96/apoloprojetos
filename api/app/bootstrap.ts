import { requireSession } from '../_lib/auth'
import { getBootstrapData } from '../_lib/app-data'
import { json, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
