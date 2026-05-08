import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const IMPORT_SOURCE = 'Importado do CSV'
const IMPORT_ACTOR = 'import-csv'
let createId
let nowIso

function loadEnvFile(filePath = '.env.local') {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (key && process.env[key] == null) process.env[key] = value
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((items) => items.some((item) => String(item).trim()))
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function keyOf(value) {
  return cleanText(value).toLowerCase()
}

function parseMoney(value) {
  const text = cleanText(value)
  if (!text) return 0
  const normalized = text.replace(/R\$/gi, '').replace(/\s/g, '').replace(/,/g, '')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

function parseDate(value) {
  const text = cleanText(value)
  if (!text) return null
  const candidate = text.includes('→') ? text.split('→').at(-1).trim() : text

  const br = candidate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`

  const date = new Date(candidate)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function parseDateTime(value) {
  const text = cleanText(value)
  if (!text) return nowIso()
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString()
}

function originalStatus(row) {
  return cleanText(row.Status)
}

function commercialLeadStage(status) {
  switch (status) {
    case 'Propostas Enviadas': return 'proposal'
    case 'Não fechado': return 'lost'
    case 'Backlog de projetos': return 'incoming'
    default: return null
  }
}

function isCommercialOnlyStatus(status) {
  return commercialLeadStage(status) != null
}

function splitDisciplines(value) {
  const disciplines = cleanText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return disciplines.length ? disciplines : ['Geral']
}

function subprojectStage(status) {
  switch (status) {
    case 'Concluído': return 'concluído'
    case 'Entregue sem pagamento': return 'concluído'
    case 'Em andamento': return 'em-andamento'
    case 'Acompanhamentos': return 'aguardando-revisao'
    case 'Pendências terceiros': return 'bloqueado'
    case 'Aguardando terceiros': return 'bloqueado'
    case 'Aguardando disponibilidade': return 'a-fazer'
    case 'Propostas Enviadas':
    case 'Não fechado':
    case 'Backlog de projetos':
    default: return 'a-fazer'
  }
}

function projectStage(statuses) {
  const unique = new Set(statuses)
  if (unique.has('Pendências terceiros')) return 'bloqueado'
  if (unique.has('Aguardando terceiros')) return 'bloqueado'
  if (unique.has('Em andamento') || unique.has('Acompanhamentos')) return 'em-andamento'
  if (unique.has('Entregue sem pagamento')) return 'concluído-aguardando-pagamento'
  if (unique.size > 0 && [...unique].every((status) => status === 'Concluído')) return 'concluído'
  return 'aguardar'
}

function buildStatusNote(group) {
  const statuses = [...new Set(group.rows.map(originalStatus).filter(Boolean))]
  const situacoes = [...new Set(group.rows.map((row) => cleanText(row['Situação '])).filter(Boolean))]
  const area = group.rows.find((row) => cleanText(row['Área']))?.['Área']
  return [
    IMPORT_SOURCE,
    statuses.length ? `Status: ${statuses.join(', ')}` : '',
    situacoes.length ? `Situação: ${situacoes.join(', ')}` : '',
    area ? `Área: ${area} m²` : '',
  ].filter(Boolean).join(' · ')
}

function firstValue(rows, field) {
  return rows.map((row) => cleanText(row[field])).find(Boolean) || ''
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
}

function makeGroups(records) {
  const groups = new Map()
  for (const row of records) {
    const name = cleanText(row.Nome)
    if (!name) continue
    const key = keyOf(name)
    if (!groups.has(key)) groups.set(key, { name, rows: [] })
    groups.get(key).rows.push(row)
  }
  return [...groups.values()]
}

function makeLeadGroups(records) {
  return makeGroups(records.filter((row) => isCommercialOnlyStatus(originalStatus(row))))
}

function makeProjectGroups(records) {
  return makeGroups(records.filter((row) => !isCommercialOnlyStatus(originalStatus(row))))
}

function addLog(statements, projectId, type, title, details, dueDate = null, status = 'done') {
  statements.push({
    sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [createId('log'), projectId, type, title, details, dueDate, status, IMPORT_ACTOR, nowIso()],
  })
}

async function flush(db, statements) {
  const size = 150
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size), 'write')
  }
}

async function main() {
  loadEnvFile()
  const dbModule = await import(`../api/_lib/db.js?env=${Date.now()}`)
  const { ensureSchema, getDb } = dbModule
  createId = dbModule.createId
  nowIso = dbModule.nowIso

  const csvPath = process.argv[2]
  if (!csvPath) throw new Error('Usage: node scripts/import-apolo-csv.mjs path/to/file.csv')

  await ensureSchema()
  const db = getDb()
  const rows = parseCsv(readFileSync(resolve(csvPath), 'utf8'))
  const headers = rows[0].map(cleanText)
  const records = rows.slice(1).map((row) => rowToObject(headers, row))
  const leadGroups = makeLeadGroups(records)
  const projectGroups = makeProjectGroups(records)
  const timestamp = nowIso()

  const statements = [
    { sql: 'DELETE FROM partner_payouts', args: [] },
    { sql: 'DELETE FROM project_expenses', args: [] },
    { sql: 'DELETE FROM payment_receipts', args: [] },
    { sql: 'DELETE FROM project_logs', args: [] },
    { sql: 'DELETE FROM subprojects', args: [] },
    { sql: 'DELETE FROM projects', args: [] },
    { sql: 'DELETE FROM leads', args: [] },
    { sql: 'DELETE FROM clients', args: [] },
  ]

  let clientCount = 0
  let projectCount = 0
  let subprojectCount = 0
  let leadCount = 0

  const clientIdsByName = new Map()

  function queueClient(name, createdAt) {
    const key = keyOf(name)
    const existingId = clientIdsByName.get(key)
    if (existingId) return existingId
    const clientId = createId('client')
    clientIdsByName.set(key, clientId)
    statements.push({
      sql: `INSERT INTO clients (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      args: [clientId, name, createdAt, timestamp],
    })
    clientCount += 1
    return clientId
  }

  for (const group of projectGroups) {
    const projectId = createId('project')
    const statuses = group.rows.map(originalStatus)
    const expandedRows = group.rows.flatMap((row) => {
      const disciplines = splitDisciplines(row.Disciplina)
      const amount = parseMoney(row.Valor)
      const splitAmount = disciplines.length > 1 ? amount / disciplines.length : amount
      return disciplines.map((discipline) => ({ row, discipline, amount: splitAmount }))
    })
    const amount = expandedRows.reduce((sum, item) => sum + item.amount, 0)
    const createdAt = parseDateTime(firstValue(group.rows, 'Criado em'))
    const deadline = group.rows.map((row) => parseDate(row['Data de entrega prevista'])).filter(Boolean).sort().at(-1) ?? null
    const disciplineSummary = [...new Set(expandedRows.map((item) => item.discipline).filter(Boolean))].join(', ')
    const ownerSummary = [...new Set(group.rows.map((row) => cleanText(row.Responsável)).filter(Boolean))].join(', ')
    const stage = projectStage(statuses)
    const clientId = queueClient(group.name, createdAt)

    statements.push({
      sql: `INSERT INTO projects (
              id, client_id, name, code, discipline, stage, contract_amount, sales_owner,
              sales_bonus_percent, base_partner_split_percent, deadline, status_note, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, 50, ?, ?, ?, ?, ?)`,
      args: [
        projectId,
        clientId,
        group.name,
        null,
        disciplineSummary,
        stage,
        amount,
        ownerSummary,
        deadline,
        buildStatusNote(group),
        `Importado de ${group.rows.length} linha(s) do CSV.`,
        createdAt,
        timestamp,
      ],
    })
    projectCount += 1

    for (const item of expandedRows) {
      const row = item.row
      const status = originalStatus(row)
      const subAmount = item.amount
      const subStage = subprojectStage(status)
      const contractedAt = parseDate(row['Data de contratação'])
      const subCreatedAt = parseDateTime(row['Criado em'])
      const discipline = item.discipline
      const responsible = cleanText(row.Responsável) || 'A definir'

      statements.push({
        sql: `INSERT INTO subprojects (
                id, project_id, discipline, amount, stage, responsible_partner, contracted_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [createId('sp'), projectId, discipline, subAmount, subStage, responsible, contractedAt, subCreatedAt, timestamp],
      })
      subprojectCount += 1

      const proposalSentAt = parseDate(row['Data de Envio da Proposta'])
      const dispatchAt = parseDate(row['Data despacho'])
      const deliveredAt = parseDate(row['Data entrega real'])
      const rowDeadline = parseDate(row['Data de entrega prevista'])

      addLog(statements, projectId, 'note', `Importado: ${discipline}`, `Status original: ${status || 'sem status'} · Responsável: ${responsible}`, null)
      if (proposalSentAt) addLog(statements, projectId, 'note', 'Proposta enviada', `Disciplina: ${discipline}`, proposalSentAt)
      if (contractedAt) addLog(statements, projectId, 'note', 'Contratação registrada', `Disciplina: ${discipline}`, contractedAt)
      if (dispatchAt) addLog(statements, projectId, 'note', 'Despacho registrado', `Disciplina: ${discipline}`, dispatchAt)
      if (rowDeadline && !deliveredAt) addLog(statements, projectId, 'pending', 'Entrega prevista', `Disciplina: ${discipline}`, rowDeadline, subStage === 'concluído' ? 'done' : 'open')
      if (deliveredAt) addLog(statements, projectId, 'delivery', 'Entrega concluída', `Disciplina: ${discipline}`, deliveredAt)
    }
  }

  for (const group of leadGroups) {
    const createdAt = parseDateTime(firstValue(group.rows, 'Criado em'))
    const amount = group.rows.reduce((sum, row) => sum + parseMoney(row.Valor), 0)
    const ownerSummary = [...new Set(group.rows.map((row) => cleanText(row.Responsável)).filter(Boolean))].join(', ')
    const clientId = queueClient(group.name, createdAt)
    const leadStages = [...new Set(group.rows.map((row) => commercialLeadStage(originalStatus(row))).filter(Boolean))]
    if (leadStages.length) {
      const leadStage = leadStages.includes('proposal') ? 'proposal' : leadStages.includes('lost') ? 'lost' : 'incoming'
      statements.push({
        sql: `INSERT INTO leads (
                id, client_id, title, stage, source, estimated_amount, sales_owner, notes,
                inbound_at, proposal_sent_at, closed_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('lead'),
          clientId,
          group.name,
          leadStage,
          IMPORT_SOURCE,
          amount,
          ownerSummary,
          buildStatusNote(group),
          parseDate(firstValue(group.rows, 'Criado em')) ?? createdAt.slice(0, 10),
          group.rows.map((row) => parseDate(row['Data de Envio da Proposta'])).filter(Boolean).sort().at(-1) ?? null,
          leadStage === 'lost' ? timestamp.slice(0, 10) : null,
          createdAt,
          timestamp,
        ],
      })
      leadCount += 1
    }
  }

  console.log(`Importing ${records.length} CSV rows as ${projectGroups.length} projects and ${leadGroups.length} leads into ${process.env.APP_USE_REMOTE_DB === 'true' ? 'remote' : 'local'} database...`)
  await flush(db, statements)

  const counts = await Promise.all([
    db.execute('SELECT COUNT(*) AS total FROM clients'),
    db.execute('SELECT COUNT(*) AS total FROM projects'),
    db.execute('SELECT COUNT(*) AS total FROM subprojects'),
    db.execute('SELECT COUNT(*) AS total FROM leads'),
    db.execute('SELECT COUNT(*) AS total FROM project_logs'),
  ])

  console.log(JSON.stringify({
    csvRows: records.length,
    clients: clientCount,
    projects: projectCount,
    subprojects: subprojectCount,
    leads: leadCount,
    dbCounts: {
      clients: Number(counts[0].rows[0].total),
      projects: Number(counts[1].rows[0].total),
      subprojects: Number(counts[2].rows[0].total),
      leads: Number(counts[3].rows[0].total),
      logs: Number(counts[4].rows[0].total),
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
