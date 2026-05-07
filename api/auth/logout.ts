import { clearSessionCookie } from '../_lib/auth'
import { json, methodNotAllowed, type ApiRequest, type ApiResponse } from '../_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  res.setHeader('Set-Cookie', clearSessionCookie())
  return json(res, 200, { ok: true })
}
