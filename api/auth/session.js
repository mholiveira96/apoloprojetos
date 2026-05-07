import { getSession } from '../_lib/auth.js'
import { json, methodNotAllowed } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const user = getSession(req)
  return json(res, 200, { user })
}
