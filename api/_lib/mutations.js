import { createId, ensureSchema, getDb, nowIso } from './db.js'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
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
      await db.execute({
        sql: `INSERT INTO leads (id, client_id, title, stage, source, estimated_amount, sales_owner, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('lead'),
          clientId,
          normalizeText(payload.title),
          normalizeText(payload.stage) || 'incoming',
          normalizeText(payload.source),
          normalizeAmount(payload.estimatedAmount),
          normalizeText(payload.salesOwner),
          normalizeText(payload.notes),
          timestamp,
          timestamp,
        ],
      })
      return { ok: true }
    }

    case 'updateLeadStage': {
      await db.execute({
        sql: 'UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?',
        args: [normalizeText(payload.stage), timestamp, normalizeText(payload.id)],
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
