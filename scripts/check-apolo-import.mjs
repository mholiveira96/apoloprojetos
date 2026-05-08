import { readFileSync, existsSync } from 'node:fs'

function loadEnvFile(filePath = '.env.local') {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    process.env[trimmed.slice(0, index).trim()] ??= trimmed.slice(index + 1).trim()
  }
}

loadEnvFile()
const { ensureSchema, getDb } = await import(`../api/_lib/db.js?env=${Date.now()}`)

await ensureSchema()
const db = getDb()

const queries = {
  projects: `SELECT stage, COUNT(*) AS total, SUM(contract_amount) AS amount FROM projects GROUP BY stage ORDER BY stage`,
  subprojects: `SELECT stage, COUNT(*) AS total, SUM(amount) AS amount FROM subprojects GROUP BY stage ORDER BY stage`,
  leads: `SELECT stage, COUNT(*) AS total, SUM(estimated_amount) AS amount FROM leads GROUP BY stage ORDER BY stage`,
  commercialProjects: `
    SELECT COUNT(*) AS total
    FROM projects
    WHERE status_note LIKE '%Não fechado%'
      OR status_note LIKE '%Propostas Enviadas%'
      OR status_note LIKE '%Backlog de projetos%'
  `,
  blockedSubprojects: `SELECT COUNT(*) AS total FROM subprojects WHERE stage = 'bloqueado'`,
  multiDisciplineProjects: `SELECT name, discipline FROM projects WHERE discipline LIKE '%,%' LIMIT 5`,
}

const output = {}
for (const [name, sql] of Object.entries(queries)) {
  const result = await db.execute(sql)
  output[name] = result.rows
}

console.log(JSON.stringify(output, null, 2))
