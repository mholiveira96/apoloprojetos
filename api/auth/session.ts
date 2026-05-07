import { getSession } from '../_lib/auth'
import { json, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const user = getSession(req)
  return json(res, 200, { user })
}
