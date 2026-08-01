import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])

  try {
    const body = await readJsonBody(req)
    const payload = body && typeof body === 'object' ? body : {}
    const mutationsPath = path.resolve(__dirname, '../_lib/mutations.js')
    const mtime = await fs.stat(mutationsPath).then((stat) => stat.mtimeMs)
    const { runMutation } = await import(`${pathToFileURL(mutationsPath).href}?t=${mtime}`)

    await runMutation('savePremiseQuestionnaire', {
      respondentName: payload.respondentName,
      contactInfo: payload.contactInfo,
      identificationNote: payload.identificationNote,
      answers: payload.answers,
      status: 'completed',
    }, 'public-questionnaire')

    // Deliberately return no record, id, or answer payload. Reads remain private in /app.
    return json(res, 201, { ok: true })
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : 'Não foi possível enviar o questionário' })
  }
}
