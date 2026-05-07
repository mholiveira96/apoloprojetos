import { readFileSync, existsSync } from 'node:fs'
import { ensureSchema, getDb, createId, nowIso } from '../api/_lib/db.js'

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || 'b378cd2d-2148-423a-a6c5-f34f852a0eef'
const NOTION_VERSION = '2022-06-28'
const IMPORT_SOURCE = 'Importado do Notion'
const IMPORT_ACTOR = 'import-notion'
const BATCH_SIZE = 200

function loadNotionToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN.trim()
  const fallback = '/home/clawd/.config/notion/api_key'
  if (existsSync(fallback)) return readFileSync(fallback, 'utf8').trim()
  throw new Error('NOTION_TOKEN não configurado e ~/.config/notion/api_key não encontrado')
}

const notionToken = loadNotionToken()

function titleValue(prop) {
  return (prop?.title || []).map((item) => item.plain_text || '').join('').trim()
}
function numberValue(prop) { return Number(prop?.number || 0) }
function dateValue(prop) { return prop?.date?.start || null }
function selectValue(prop) { return prop?.select?.name || '' }
function statusValue(prop) { return prop?.status?.name || '' }
function formulaString(prop) { return prop?.formula?.string || '' }
function checkboxValue(prop) { return Boolean(prop?.checkbox) }
function multiSelectValue(prop) { return (prop?.multi_select || []).map((item) => item.name).filter(Boolean) }
function keyOf(value) { return String(value || '').trim().toLowerCase() }

function cleanOwner(value) {
  const owner = String(value || '').trim()
  if (!owner) return ''
  if (owner === 'Luis') return 'Luís'
  if (owner === 'Leticia') return 'Letícia'
  return owner
}

function mapLeadStage(status) {
  switch (status) {
    case 'Propostas Enviadas': return 'proposal'
    case 'Acompanhamentos': return 'negotiation'
    case 'Não fechado': return 'lost'
    case 'Aguardando disponibilidade':
    case 'Backlog de projetos': return 'incoming'
    default: return 'incoming'
  }
}

function mapProjectStage(status) {
  switch (status) {
    case 'Concluído': return 'closed'
    case 'Entregue sem pagamento': return 'delivered'
    case 'Em andamento': return 'in-progress'
    case 'Pendências terceiros':
    case 'Aguardando disponibilidade': return 'waiting-files'
    case 'Acompanhamentos': return 'review'
    case 'Propostas Enviadas':
    case 'Backlog de projetos':
    case 'Não fechado':
    default: return 'proposal'
  }
}

function isCommercialLead(status) {
  return ['Propostas Enviadas', 'Acompanhamentos', 'Não fechado', 'Aguardando disponibilidade', 'Backlog de projetos'].includes(status)
}

function buildStatusNote(item) {
  return [
    'Importado do Notion',
    item.originalStatus ? `Status original: ${item.originalStatus}` : '',
    item.situacao ? `Situação: ${item.situacao}` : '',
    item.responsavel ? `Responsável: ${item.responsavel}` : '',
    item.disciplinas.length ? `Disciplinas: ${item.disciplinas.join(', ')}` : '',
    item.area ? `Área: ${item.area} m²` : '',
    item.temContrato ? 'Contrato marcado no Notion' : '',
  ].filter(Boolean).join(' · ')
}

async function notionRequest(path, body) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`Falha no Notion (${response.status}): ${await response.text()}`)
  return response.json()
}

async function fetchAllPages() {
  const pages = []
  let cursor = null
  while (true) {
    const payload = { page_size: 100 }
    if (cursor) payload.start_cursor = cursor
    const data = await notionRequest(`/databases/${NOTION_DATABASE_ID}/query`, payload)
    pages.push(...(data.results || []))
    if (!data.has_more) break
    cursor = data.next_cursor
  }
  return pages
}

function normalizePage(page) {
  const props = page.properties || {}
  const nome = titleValue(props.Nome)
  const originalStatus = statusValue(props.Status)
  return {
    pageId: page.id,
    code: `NTN-${page.id.replace(/-/g, '').toUpperCase()}`,
    nome,
    originalStatus,
    situacao: formulaString(props['Situação ']),
    valor: numberValue(props.Valor),
    disciplinas: multiSelectValue(props.Disciplina),
    responsavel: cleanOwner(selectValue(props.Responsável)),
    area: numberValue(props['Área']),
    temContrato: checkboxValue(props.Contrato),
    dataProposta: dateValue(props['Data de Envio da Proposta']),
    dataContratacao: dateValue(props['Data de contratação']),
    prazoEntrega: dateValue(props['Data de entrega prevista']),
    dataEntregaReal: dateValue(props['Data entrega real']),
    dataDespacho: dateValue(props['Data despacho']),
    leadStage: mapLeadStage(originalStatus),
    projectStage: mapProjectStage(originalStatus),
  }
}

function pushLog(statements, counters, projectId, type, title, details, dueDate = null, status = 'open') {
  statements.push({
    sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [createId('log'), projectId, type, title, details, dueDate, status, IMPORT_ACTOR, nowIso()],
  })
  counters.logs += 1
}

async function flushBatches(db, statements) {
  for (let index = 0; index < statements.length; index += BATCH_SIZE) {
    const chunk = statements.slice(index, index + BATCH_SIZE)
    await db.batch(chunk, 'write')
  }
}

async function main() {
  await ensureSchema()
  const db = getDb()
  const [clientRows, projectRows, rawPages] = await Promise.all([
    db.execute('SELECT id, name FROM clients'),
    db.execute('SELECT id, code FROM projects WHERE code IS NOT NULL'),
    fetchAllPages(),
  ])

  const clientsByName = new Map(clientRows.rows.map((row) => [keyOf(row.name), row.id]))
  const projectsByCode = new Map(projectRows.rows.map((row) => [row.code, row.id]))
  const pages = rawPages.map(normalizePage).filter((item) => item.nome)

  const statements = [
    { sql: 'DELETE FROM leads WHERE source = ?', args: [IMPORT_SOURCE] },
    { sql: `DELETE FROM payment_receipts WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'NTN-%')`, args: [] },
    { sql: `DELETE FROM project_expenses WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'NTN-%')`, args: [] },
    { sql: `DELETE FROM partner_payouts WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'NTN-%')`, args: [] },
    { sql: `DELETE FROM project_logs WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'NTN-%')`, args: [] },
    { sql: `DELETE FROM projects WHERE code LIKE 'NTN-%'`, args: [] },
    { sql: 'DELETE FROM project_logs WHERE created_by = ?', args: [IMPORT_ACTOR] },
  ]

  const counters = { pages: pages.length, projects: 0, leads: 0, logs: 0, clients: 0 }

  for (const item of pages) {
    const clientKey = keyOf(item.nome)
    let clientId = clientsByName.get(clientKey)
    if (!clientId) {
      clientId = createId('cli')
      clientsByName.set(clientKey, clientId)
      statements.push({
        sql: 'INSERT INTO clients (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
        args: [clientId, item.nome, nowIso(), nowIso()],
      })
      counters.clients += 1
    } else {
      statements.push({
        sql: 'UPDATE clients SET updated_at = ? WHERE id = ?',
        args: [nowIso(), clientId],
      })
    }

    let projectId = projectsByCode.get(item.code)
    if (!projectId) {
      projectId = createId('prj')
      projectsByCode.set(item.code, projectId)
      statements.push({
        sql: `INSERT INTO projects (
          id, client_id, name, code, discipline, stage, contract_amount, sales_owner,
          deadline, status_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          projectId,
          clientId,
          item.nome,
          item.code,
          item.disciplinas.join(', '),
          item.projectStage,
          item.valor,
          item.responsavel,
          item.prazoEntrega,
          buildStatusNote(item),
          nowIso(),
          nowIso(),
        ],
      })
    } else {
      statements.push({
        sql: `UPDATE projects
              SET client_id = ?, name = ?, discipline = ?, stage = ?, contract_amount = ?, sales_owner = ?, deadline = ?, status_note = ?, updated_at = ?
              WHERE id = ?`,
        args: [
          clientId,
          item.nome,
          item.disciplinas.join(', '),
          item.projectStage,
          item.valor,
          item.responsavel,
          item.prazoEntrega,
          buildStatusNote(item),
          nowIso(),
          projectId,
        ],
      })
    }
    counters.projects += 1

    if (isCommercialLead(item.originalStatus)) {
      statements.push({
        sql: `INSERT INTO leads (id, client_id, title, stage, source, estimated_amount, sales_owner, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('lead'),
          clientId,
          item.nome,
          item.leadStage,
          IMPORT_SOURCE,
          item.valor,
          item.responsavel,
          `[notion:${item.pageId}] ${buildStatusNote(item)}`,
          nowIso(),
          nowIso(),
        ],
      })
      counters.leads += 1
    }

    pushLog(statements, counters, projectId, 'note', 'Importado do Notion', buildStatusNote(item), null, 'done')
    if (item.dataProposta) pushLog(statements, counters, projectId, 'note', 'Proposta enviada', 'Data importada do Notion.', item.dataProposta, 'done')
    if (item.dataContratacao) pushLog(statements, counters, projectId, 'note', 'Contratação registrada', 'Data de contratação importada do Notion.', item.dataContratacao, 'done')
    if (item.dataDespacho) pushLog(statements, counters, projectId, 'note', 'Despacho registrado', 'Data de despacho importada do Notion.', item.dataDespacho, 'done')
    if (item.prazoEntrega && !item.dataEntregaReal) pushLog(statements, counters, projectId, 'pending', 'Entrega prevista', 'Prazo importado do Notion.', item.prazoEntrega, 'open')
    if (item.dataEntregaReal) pushLog(statements, counters, projectId, 'delivery', 'Entrega concluída', 'Data de entrega real importada do Notion.', item.dataEntregaReal, 'done')
  }

  console.log(`Importando ${pages.length} páginas do Notion em ${statements.length} operações...`)
  await flushBatches(db, statements)
  console.log(JSON.stringify(counters, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
