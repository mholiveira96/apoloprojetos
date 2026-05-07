import { createId, ensureSchema, getDb, nowIso } from './db.js'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function normalizeDate(value) {
  const text = String(value ?? '').trim()
  return text || null
}

function todayIsoDate() {
  return nowIso().slice(0, 10)
}

async function upsertClient(clientName, extras = {}) {
  const db = getDb()
  const name = normalizeText(clientName)
  if (!name) return null

  const existing = await db.execute({
    sql: 'SELECT id FROM clients WHERE lower(name) = lower(?) LIMIT 1',
    args: [name],
  })

  const timestamp = nowIso()

  if (existing.rows[0]?.id) {
    const clientId = String(existing.rows[0].id)
    await db.execute({
      sql: `UPDATE clients
            SET company_name = COALESCE(?, company_name),
                contact_name = COALESCE(?, contact_name),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?`,
      args: [
        normalizeText(extras.companyName),
        normalizeText(extras.contactName),
        normalizeText(extras.phone),
        normalizeText(extras.email),
        normalizeText(extras.notes),
        timestamp,
        clientId,
      ],
    })
    return clientId
  }

  const id = createId('client')
  await db.execute({
    sql: `INSERT INTO clients (id, name, company_name, contact_name, phone, email, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      name,
      normalizeText(extras.companyName),
      normalizeText(extras.contactName),
      normalizeText(extras.phone),
      normalizeText(extras.email),
      normalizeText(extras.notes),
      timestamp,
      timestamp,
    ],
  })
  return id
}

export async function runMutation(action, payload, actor) {
  await ensureSchema()
  const db = getDb()
  const timestamp = nowIso()

  switch (action) {
    case 'createLead': {
      const clientId = await upsertClient(normalizeText(payload.clientName), payload)
      const stage = normalizeText(payload.stage) || 'incoming'
      const inboundAt = normalizeDate(payload.inboundAt) || todayIsoDate()
      const nextFollowUpAt = normalizeDate(payload.nextFollowUpAt)
      await db.execute({
        sql: `INSERT INTO leads (
                id, client_id, title, stage, source, estimated_amount, sales_owner, notes,
                inbound_at, first_contact_at, last_contact_at, next_follow_up_at, proposal_sent_at, closed_at,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('lead'),
          clientId,
          normalizeText(payload.title),
          stage,
          normalizeText(payload.source),
          normalizeAmount(payload.estimatedAmount),
          normalizeText(payload.salesOwner),
          normalizeText(payload.notes),
          inboundAt,
          normalizeDate(payload.firstContactAt),
          normalizeDate(payload.lastContactAt),
          nextFollowUpAt,
          stage === 'proposal' ? (normalizeDate(payload.proposalSentAt) || todayIsoDate()) : normalizeDate(payload.proposalSentAt),
          ['won', 'lost'].includes(stage) ? (normalizeDate(payload.closedAt) || todayIsoDate()) : normalizeDate(payload.closedAt),
          timestamp,
          timestamp,
        ],
      })
      return { ok: true }
    }

    case 'updateLeadStage': {
      const nextStage = normalizeText(payload.stage)
      const shouldStampProposal = nextStage === 'proposal'
      const shouldStampClosed = ['won', 'lost'].includes(nextStage)
      await db.execute({
        sql: `UPDATE leads
              SET stage = ?,
                  proposal_sent_at = CASE
                    WHEN ? = 1 THEN COALESCE(proposal_sent_at, ?)
                    ELSE proposal_sent_at
                  END,
                  closed_at = CASE
                    WHEN ? = 1 THEN COALESCE(closed_at, ?)
                    WHEN ? = 0 THEN NULL
                    ELSE closed_at
                  END,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          nextStage,
          shouldStampProposal ? 1 : 0,
          todayIsoDate(),
          shouldStampClosed ? 1 : 0,
          todayIsoDate(),
          shouldStampClosed ? 1 : 0,
          timestamp,
          normalizeText(payload.id),
        ],
      })
      return { ok: true }
    }

    case 'updateLead': {
      const stage = normalizeText(payload.stage) || 'incoming'
      await db.execute({
        sql: `UPDATE leads
              SET title = ?,
                  stage = ?,
                  source = ?,
                  estimated_amount = ?,
                  sales_owner = ?,
                  notes = ?,
                  inbound_at = ?,
                  first_contact_at = ?,
                  last_contact_at = ?,
                  next_follow_up_at = ?,
                  proposal_sent_at = ?,
                  closed_at = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.title),
          stage,
          normalizeText(payload.source),
          normalizeAmount(payload.estimatedAmount),
          normalizeText(payload.salesOwner),
          normalizeText(payload.notes),
          normalizeDate(payload.inboundAt),
          normalizeDate(payload.firstContactAt),
          normalizeDate(payload.lastContactAt),
          normalizeDate(payload.nextFollowUpAt),
          stage === 'proposal' ? (normalizeDate(payload.proposalSentAt) || null) : normalizeDate(payload.proposalSentAt),
          ['won', 'lost'].includes(stage) ? normalizeDate(payload.closedAt) : null,
          timestamp,
          normalizeText(payload.id),
        ],
      })
      return { ok: true }
    }

    case 'touchLead': {
      await db.execute({
        sql: `UPDATE leads
              SET first_contact_at = COALESCE(first_contact_at, ?),
                  last_contact_at = ?,
                  next_follow_up_at = COALESCE(?, next_follow_up_at),
                  updated_at = ?
              WHERE id = ?`,
        args: [todayIsoDate(), todayIsoDate(), normalizeDate(payload.nextFollowUpAt), timestamp, normalizeText(payload.id)],
      })
      return { ok: true }
    }

    case 'createProject': {
      const clientId = await upsertClient(normalizeText(payload.clientName), payload)
      await db.execute({
        sql: `INSERT INTO projects (
                id, client_id, name, code, discipline, stage, contract_amount,
                sales_owner, sales_bonus_percent, base_partner_split_percent,
                deadline, status_note, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('project'),
          clientId,
          normalizeText(payload.name),
          normalizeText(payload.code),
          normalizeText(payload.discipline),
          normalizeText(payload.stage) || 'proposal',
          normalizeAmount(payload.contractAmount),
          normalizeText(payload.salesOwner),
          normalizeAmount(payload.salesBonusPercent) || 10,
          normalizeAmount(payload.basePartnerSplitPercent) || 50,
          normalizeText(payload.deadline),
          normalizeText(payload.statusNote),
          timestamp,
          timestamp,
        ],
      })
      return { ok: true }
    }

    case 'updateProjectStage': {
      await db.execute({
        sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?',
        args: [normalizeText(payload.stage), timestamp, normalizeText(payload.id)],
      })
      return { ok: true }
    }

    case 'updateProject': {
      await db.execute({
        sql: `UPDATE projects
              SET name = ?,
                  code = ?,
                  discipline = ?,
                  stage = ?,
                  contract_amount = ?,
                  sales_owner = ?,
                  deadline = ?,
                  status_note = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.name),
          normalizeText(payload.code),
          normalizeText(payload.discipline),
          normalizeText(payload.stage) || 'proposal',
          normalizeAmount(payload.contractAmount),
          normalizeText(payload.salesOwner),
          normalizeText(payload.deadline),
          normalizeText(payload.statusNote),
          timestamp,
          normalizeText(payload.id),
        ],
      })
      return { ok: true }
    }

    case 'addProjectLog': {
      await db.execute({
        sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('log'),
          normalizeText(payload.projectId),
          normalizeText(payload.logType) || 'note',
          normalizeText(payload.title),
          normalizeText(payload.details),
          normalizeText(payload.dueDate),
          normalizeText(payload.status) || 'open',
          actor,
          timestamp,
        ],
      })
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, normalizeText(payload.projectId)],
      })
      return { ok: true }
    }

    case 'updateProjectLog': {
      await db.execute({
        sql: `UPDATE project_logs
              SET project_id = ?,
                  log_type = ?,
                  title = ?,
                  details = ?,
                  due_date = ?,
                  status = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.projectId),
          normalizeText(payload.logType) || 'note',
          normalizeText(payload.title),
          normalizeText(payload.details),
          normalizeText(payload.dueDate),
          normalizeText(payload.status) || 'open',
          normalizeText(payload.id),
        ],
      })
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, normalizeText(payload.projectId)],
      })
      return { ok: true }
    }

    case 'addReceipt': {
      await db.execute({
        sql: `INSERT INTO payment_receipts (id, project_id, amount, bank_account, received_at, note, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('receipt'),
          normalizeText(payload.projectId),
          normalizeAmount(payload.amount),
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.note),
          actor,
          timestamp,
        ],
      })
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, normalizeText(payload.projectId)],
      })
      return { ok: true }
    }

    case 'addExpense': {
      await db.execute({
        sql: `INSERT INTO project_expenses (id, project_id, amount, category, bank_account, paid_at, vendor, note, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('expense'),
          normalizeText(payload.projectId),
          normalizeAmount(payload.amount),
          normalizeText(payload.category),
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.vendor),
          normalizeText(payload.note),
          actor,
          timestamp,
        ],
      })
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, normalizeText(payload.projectId)],
      })
      return { ok: true }
    }

    case 'addPayout': {
      await db.execute({
        sql: `INSERT INTO partner_payouts (id, project_id, partner_name, amount, bank_account, paid_at, note, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('payout'),
          normalizeText(payload.projectId),
          normalizeText(payload.partnerName),
          normalizeAmount(payload.amount),
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.note),
          actor,
          timestamp,
        ],
      })
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, normalizeText(payload.projectId)],
      })
      return { ok: true }
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
