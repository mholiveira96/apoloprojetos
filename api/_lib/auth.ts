import crypto from 'node:crypto'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'
import type { ApiRequest, ApiResponse } from './http'

const COOKIE_NAME = 'apolo_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

type SessionUser = {
  email: string
  name: string
}

function getSecret() {
  const secret = process.env.APP_AUTH_SECRET
  if (!secret) throw new Error('Missing APP_AUTH_SECRET')
  return secret
}

function base64url(input: string) {
  return Buffer.from(input).toString('base64url')
}

function decodeBase64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function getEnvUsers() {
  const users: Array<{ email: string; password: string; name: string }> = []

  for (let i = 1; i <= 9; i += 1) {
    const email = process.env[`APP_USER_${i}_EMAIL`]
    const password = process.env[`APP_USER_${i}_PASSWORD`]
    const name = process.env[`APP_USER_${i}_NAME`] || email?.split('@')[0] || `User ${i}`

    if (email && password) {
      users.push({ email: email.toLowerCase(), password, name })
    }
  }

  return users
}

export function authenticate(email: string, password: string): SessionUser | null {
  const normalizedEmail = email.trim().toLowerCase()
  const user = getEnvUsers().find(
    (entry) => entry.email === normalizedEmail && entry.password === password,
  )

  if (!user) return null

  return { email: user.email, name: user.name }
}

export function createSessionCookie(user: SessionUser) {
  const payload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const encoded = base64url(JSON.stringify(payload))
  const signature = sign(encoded)

  return serializeCookie(COOKIE_NAME, `${encoded}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie() {
  return serializeCookie(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    expires: new Date(0),
  })
}

export function getSession(req: ApiRequest): SessionUser | null {
  const cookies = parseCookie(req.headers.cookie || '')
  const raw = cookies[COOKIE_NAME]

  if (!raw) return null

  const [encoded, signature] = raw.split('.')
  if (!encoded || !signature) return null
  if (sign(encoded) !== signature) return null

  try {
    const payload = JSON.parse(decodeBase64url(encoded)) as SessionUser & { exp: number }
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return { email: payload.email, name: payload.name }
  } catch {
    return null
  }
}

export function requireSession(req: ApiRequest, res: ApiResponse) {
  const session = getSession(req)
  if (!session) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return null
  }
  return session
}
