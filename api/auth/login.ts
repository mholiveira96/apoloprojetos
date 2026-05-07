import { authenticate, createSessionCookie } from '../_lib/auth'
import { json, methodNotAllowed, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  try {
    const body = await readJsonBody(req)
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const user = authenticate(email, password)

    if (!user) {
      return json(res, 401, { error: 'Credenciais inválidas' })
    }

    res.setHeader('Set-Cookie', createSessionCookie(user))
    return json(res, 200, { user })
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Login failed' })
  }
}
