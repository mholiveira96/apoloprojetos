export type ApiRequest = AsyncIterable<Uint8Array | string> & {
  method?: string
  body?: unknown
  headers: Record<string, string | undefined>
}

export type ApiResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

export async function readJsonBody(req: ApiRequest) {
  if (req.body) {
    if (typeof req.body === 'string') return JSON.parse(req.body) as Record<string, unknown>
    return req.body as Record<string, unknown>
  }

  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

export function json(res: ApiResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function methodNotAllowed(res: ApiResponse, allowed: string[]) {
  res.statusCode = 405
  res.setHeader('Allow', allowed.join(', '))
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
