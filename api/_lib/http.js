export async function readJsonBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') return JSON.parse(req.body)
    return req.body
  }

  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function methodNotAllowed(res, allowed) {
  res.statusCode = 405
  res.setHeader('Allow', allowed.join(', '))
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
