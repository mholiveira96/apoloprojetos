import { randomBytes } from 'node:crypto'
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

function normalizeAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([key, answer]) => [String(key), String(answer ?? '').trim()]),
  )
}

function todayIsoDate() {
  return nowIso().slice(0, 10)
}

function createDriveToken() {
  let token = ''
  while (token.length < 10) {
    token += randomBytes(8).toString('base64url').replace(/[^a-zA-Z0-9]/g, '')
  }
  return token.slice(0, 10)
}

function buildSubprojectPayloads(payload, contractAmount, fallbackResponsible) {
  const explicitSubprojects = Array.isArray(payload.subprojects) ? payload.subprojects : []
  if (explicitSubprojects.length > 0) {
    return explicitSubprojects.map((sp) => ({
      discipline: normalizeText(sp.discipline),
      amount: normalizeAmount(sp.amount),
      responsiblePartner: normalizeText(sp.responsiblePartner),
      deadline: normalizeDate(sp.deadline),
      observacao: normalizeText(sp.observacao),
    }))
  }

  const discipline = normalizeText(payload.discipline)
  const responsiblePartner = normalizeText(payload.salesOwner) || fallbackResponsible
  if (!discipline && !responsiblePartner && contractAmount <= 0) return []
  return [{
    discipline,
    amount: contractAmount,
    responsiblePartner,
    deadline: normalizeDate(payload.deadline),
    observacao: normalizeText(payload.observacao),
  }]
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
      const projectId = createId('project')
      const clientId = await upsertClient(normalizeText(payload.clientName), payload)
      await db.execute({
        sql: `INSERT INTO projects (
                id, client_id, name, code, area, discipline, stage, archived, contract_amount,
                sales_owner, sales_bonus_percent, base_partner_split_percent,
                status_note, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          projectId,
          clientId,
          normalizeText(payload.name),
          normalizeText(payload.code),
          normalizeAmount(payload.area),
          normalizeText(payload.discipline),
          normalizeText(payload.stage) || 'aguardar',
          0,
          normalizeAmount(payload.contractAmount),
          normalizeText(payload.salesOwner),
          normalizeAmount(payload.salesBonusPercent) || 10,
          normalizeAmount(payload.basePartnerSplitPercent) || 50,
          normalizeText(payload.statusNote),
          timestamp,
          timestamp,
        ],
      })
      if (Array.isArray(payload.subprojects) && payload.subprojects.length > 0) {
        for (const sp of payload.subprojects) {
          await db.execute({
            sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, deadline, area, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'a-fazer', ?, ?, ?, ?, ?)`,
            args: [createId('sp'), projectId, normalizeText(sp.discipline), normalizeAmount(sp.amount), normalizeText(sp.responsiblePartner), normalizeDate(sp.deadline), sp.area === null || sp.area === undefined ? null : normalizeAmount(sp.area), timestamp, timestamp],
          })
        }
      }
      return { ok: true }
    }

    case 'updateProjectStage': {
      await db.execute({
        sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?',
        args: [normalizeText(payload.stage), timestamp, normalizeText(payload.id)],
      })
      return { ok: true }
    }

    case 'setProjectArchived': {
      await db.execute({
        sql: 'UPDATE projects SET archived = ?, updated_at = ? WHERE id = ?',
        args: [payload.archived ? 1 : 0, timestamp, normalizeText(payload.id)],
      })
      return { ok: true }
    }

    case 'setProjectDriveEnabled': {
      const projectId = normalizeText(payload.projectId)
      const enabled = payload.enabled ? 1 : 0
      const tokenResult = await db.execute({
        sql: 'SELECT drive_token FROM projects WHERE id = ? LIMIT 1',
        args: [projectId],
      })
      const existingToken = normalizeText(tokenResult.rows[0]?.drive_token)
      const nextToken = enabled && !existingToken ? createDriveToken() : (existingToken || null)

      await db.execute({
        sql: `UPDATE projects
              SET drive_enabled = ?,
                  drive_token = ?,
                  drive_updated_at = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [enabled, nextToken, timestamp, timestamp, projectId],
      })
      return { ok: true }
    }

    case 'regenerateProjectDriveToken': {
      const projectId = normalizeText(payload.projectId)
      await db.execute({
        sql: `UPDATE projects
              SET drive_enabled = 1,
                  drive_token = ?,
                  drive_updated_at = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [createDriveToken(), timestamp, timestamp, projectId],
      })
      return { ok: true }
    }

    case 'updateProject': {
      const clientNameProvided = Object.prototype.hasOwnProperty.call(payload, 'clientName')
      const normalizedClientName = clientNameProvided ? normalizeText(payload.clientName) : null
      const clientId = clientNameProvided
        ? (normalizedClientName ? await upsertClient(normalizedClientName, payload) : null)
        : undefined

      await db.execute({
        sql: `UPDATE projects
              SET name = ?,
                  code = ?,
                  area = ?,
                  discipline = ?,
                  stage = ?,
                  contract_amount = ?,
                  sales_owner = ?,
                  client_id = CASE WHEN ? = 1 THEN ? ELSE client_id END,
                  status_note = ?,
                  notes = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.name),
          normalizeText(payload.code),
          normalizeAmount(payload.area),
          normalizeText(payload.discipline),
          normalizeText(payload.stage) || 'aguardar',
          normalizeAmount(payload.contractAmount),
          normalizeText(payload.salesOwner),
          clientNameProvided ? 1 : 0,
          clientNameProvided ? clientId : null,
          normalizeText(payload.statusNote),
          payload.notes != null ? String(payload.notes) : null,
          timestamp,
          normalizeText(payload.id),
        ],
      })

      const subprojectId = normalizeText(payload.subprojectId)
      if (subprojectId) {
        await db.execute({
          sql: `UPDATE subprojects
                SET responsible_partner = ?,
                    observacao = ?,
                    updated_at = ?
                WHERE id = ?`,
          args: [normalizeText(payload.salesOwner), normalizeText(payload.subprojectObservacao), timestamp, subprojectId],
        })
      }

      return { ok: true }
    }

    case 'createProjectFromLead': {
      const leadResult = await db.execute({
        sql: 'SELECT * FROM leads WHERE id = ?',
        args: [normalizeText(payload.leadId)],
      })
      const lead = leadResult.rows[0]
      if (!lead) throw new Error('Lead nÃ£o encontrado')

      const contractAmount = normalizeAmount(payload.contractAmount) || Number(lead.estimated_amount ?? 0)
      const projectId = createId('project')
      const clientId = lead.client_id ?? null
      const contractedAt = normalizeDate(payload.closedAt) || todayIsoDate()
      const responsiblePartner = normalizeText(payload.salesOwner) || String(lead.sales_owner ?? '')
      const subprojects = buildSubprojectPayloads(payload, contractAmount, responsiblePartner)

      await db.execute({
        sql: `INSERT INTO projects (
                id, client_id, name, code, area, discipline, stage, archived, contract_amount,
                sales_owner, sales_bonus_percent, base_partner_split_percent,
                status_note, lead_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'aguardar', ?, ?, ?, 10, 50, ?, ?, ?, ?)`,
        args: [
          projectId,
          clientId,
          normalizeText(payload.name) || String(lead.title ?? ''),
          normalizeText(payload.code),
          normalizeAmount(payload.area),
          null,
          0,
          contractAmount,
          normalizeText(payload.salesOwner) || String(lead.sales_owner ?? ''),
          normalizeText(payload.statusNote),
          normalizeText(payload.leadId),
          timestamp,
          timestamp,
        ],
      })

      // Create subprojects from payload or operational defaults
      if (Array.isArray(subprojects) && subprojects.length > 0) {
        for (const sp of subprojects) {
          await db.execute({
            sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, deadline, observacao, contracted_at, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'a-fazer', ?, ?, ?, ?, ?, ?)`,
            args: [
              createId('sp'),
              projectId,
              normalizeText(sp.discipline),
              normalizeAmount(sp.amount),
              normalizeText(sp.responsiblePartner),
              normalizeDate(sp.deadline),
              normalizeText(sp.observacao),
              contractedAt,
              timestamp,
              timestamp,
            ],
          })
        }
      }

      await db.execute({
        sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
              VALUES (?, ?, 'note', 'ContrataÃ§Ã£o registrada', ?, ?, 'done', ?, ?)`,
        args: [
          createId('log'),
          projectId,
          'Gerado automaticamente na conversÃ£o do lead para projeto.',
          contractedAt,
          actor,
          timestamp,
        ],
      })

      // Update lead dates from conversion
      await db.execute({
        sql: `UPDATE leads
              SET first_contact_at = COALESCE(first_contact_at, ?),
                  proposal_sent_at = COALESCE(proposal_sent_at, ?),
                  closed_at = COALESCE(closed_at, ?),
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeDate(payload.firstContactAt),
          normalizeDate(payload.proposalSentAt),
          normalizeDate(payload.closedAt) || todayIsoDate(),
          timestamp,
          normalizeText(payload.leadId),
        ],
      })

      return { ok: true }
    }

    case 'createSubproject': {
      const spProjectId = normalizeText(payload.projectId)
      if (!spProjectId) throw new Error('projectId Ã© obrigatÃ³rio')
      await db.execute({
        sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, deadline, observacao, area, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('sp'),
          spProjectId,
          normalizeText(payload.discipline),
          normalizeAmount(payload.amount),
          normalizeText(payload.stage) || 'a-fazer',
          normalizeText(payload.responsiblePartner),
          normalizeDate(payload.deadline),
          normalizeText(payload.observacao),
          payload.area === null || payload.area === undefined ? null : normalizeAmount(payload.area),
          timestamp,
          timestamp,
        ],
      })
      return { ok: true }
    }

    case 'updateSubproject': {
      const spId = normalizeText(payload.id)
      await db.execute({
        sql: `UPDATE subprojects
              SET discipline = ?,
                  amount = ?,
                  responsible_partner = ?,
                  deadline = ?,
                  observacao = ?,
                  area = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.discipline),
          normalizeAmount(payload.amount),
          normalizeText(payload.responsiblePartner),
          normalizeDate(payload.deadline),
          normalizeText(payload.observacao),
          payload.area === null || payload.area === undefined ? null : normalizeAmount(payload.area),
          timestamp,
          spId,
        ],
      })
      return { ok: true }
    }

    case 'addSubprojectComment': {
      const subprojectId = normalizeText(payload.subprojectId)
      const body = normalizeText(payload.body)
      if (!subprojectId) throw new Error('subprojectId é obrigatório')
      if (!body) throw new Error('Comentário é obrigatório')

      await db.execute({
        sql: `INSERT INTO subproject_comments (id, subproject_id, body, created_by, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [createId('spc'), subprojectId, body, actor, timestamp],
      })

      await db.execute({
        sql: 'UPDATE subprojects SET updated_at = ? WHERE id = ?',
        args: [timestamp, subprojectId],
      })

      return { ok: true }
    }

    case 'updateSubprojectStage': {
      const subId = normalizeText(payload.id)
      const newStage = normalizeText(payload.stage)
      const spProjectId = normalizeText(payload.projectId)
      const completedAt = normalizeDate(payload.completedAt)

      if (newStage === 'concluÃ­do' && !completedAt) {
        throw new Error('Data de conclusÃ£o Ã© obrigatÃ³ria')
      }

      await db.execute({
        sql: 'UPDATE subprojects SET stage = ?, updated_at = ? WHERE id = ?',
        args: [newStage, timestamp, subId],
      })

      if (newStage === 'concluÃ­do') {
        const subprojectResult = await db.execute({
          sql: 'SELECT discipline FROM subprojects WHERE id = ?',
          args: [subId],
        })
        const discipline = normalizeText(subprojectResult.rows[0]?.discipline)
        await db.execute({
          sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
                VALUES (?, ?, 'delivery', 'Entrega concluÃ­da', ?, ?, 'done', ?, ?)`,
          args: [
            createId('log'),
            spProjectId,
            discipline ? `Subprojeto concluÃ­do: ${discipline}.` : 'Subprojeto concluÃ­do.',
            completedAt,
            actor,
            timestamp,
          ],
        })
      }

      // Keep the parent project in sync with the operational state of its subprojects.
      if (spProjectId) {
        const allSp = await db.execute({
          sql: 'SELECT stage FROM subprojects WHERE project_id = ?',
          args: [spProjectId],
        })
        const stages = allSp.rows.map((row) => String(row.stage))
        const allTodo = stages.length > 0 && stages.every((stage) => stage === 'a-fazer')
        const allDone = stages.length > 0 && stages.every((stage) => stage === 'concluÃ­do')
        const hasActiveWork = stages.some((stage) => stage !== 'a-fazer' && stage !== 'concluÃ­do')

        let nextProjectStage = 'aguardar'
        if (allDone) nextProjectStage = 'concluÃ­do'
        else if (hasActiveWork) nextProjectStage = 'em-andamento'
        else if (!allTodo) nextProjectStage = 'em-andamento'

        const projectResult = await db.execute({
          sql: 'SELECT stage FROM projects WHERE id = ?',
          args: [spProjectId],
        })
        const currentStage = String(projectResult.rows[0]?.stage ?? '')

        if (currentStage !== nextProjectStage) {
          await db.execute({
            sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?',
            args: [nextProjectStage, timestamp, spProjectId],
          })
        }
      }

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
      const receiptProjectId = normalizeText(payload.projectId) || null
      if (!receiptProjectId) throw new Error('projectId Ã© obrigatÃ³rio')

      const projectRow = await db.execute({
        sql: 'SELECT client_id FROM projects WHERE id = ?',
        args: [receiptProjectId],
      })
      if (!projectRow.rows[0]) throw new Error('Projeto nÃ£o encontrado')

      let receiptClientId = projectRow.rows[0].client_id ? String(projectRow.rows[0].client_id) : null
      if (!receiptClientId) {
        receiptClientId = await upsertClient(normalizeText(payload.clientName), payload)
      }
      if (!receiptClientId) throw new Error('Cliente nÃ£o encontrado para o projeto')

      await db.execute({
        sql: `INSERT INTO payment_receipts (id, client_id, project_id, amount, bank_account, received_at, note, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('receipt'),
          receiptClientId,
          receiptProjectId,
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
        args: [timestamp, receiptProjectId],
      })
      // Auto-transition project stage when fully paid
      const allSp2 = await db.execute({
        sql: 'SELECT stage FROM subprojects WHERE project_id = ?',
        args: [receiptProjectId],
      })
      const allDone2 = allSp2.rows.length > 0 && allSp2.rows.every((r) => String(r.stage) === 'concluÃ­do')
      if (allDone2) {
        const received2 = await db.execute({
          sql: 'SELECT COALESCE(SUM(amount), 0) AS total FROM payment_receipts WHERE project_id = ?',
          args: [receiptProjectId],
        })
        const proj2 = await db.execute({
          sql: 'SELECT stage, contract_amount FROM projects WHERE id = ?',
          args: [receiptProjectId],
        })
        const p2 = proj2.rows[0]
        if (p2 && ['em-andamento', 'concluÃ­do-aguardando-pagamento'].includes(String(p2.stage))) {
          const totalReceived2 = Number(received2.rows[0]?.total ?? 0)
          const contractAmount2 = Number(p2.contract_amount ?? 0)
          if (totalReceived2 >= contractAmount2) {
            await db.execute({
              sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?',
              args: ['concluÃ­do', timestamp, receiptProjectId],
            })
          }
        }
      }
      return { ok: true }
    }

    case 'addExpense': {
      const expenseProjectId = normalizeText(payload.projectId) || null
      await db.execute({
        sql: `INSERT INTO project_expenses (id, project_id, amount, category, bank_account, paid_at, vendor, note, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('expense'),
          expenseProjectId,
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
      if (expenseProjectId) {
        await db.execute({
          sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
          args: [timestamp, expenseProjectId],
        })
      }
      return { ok: true }
    }

    case 'addPayout': {
      const subprojectId = normalizeText(payload.subprojectId) || null
      let projectId = normalizeText(payload.projectId) || null
      const rawShares = Array.isArray(payload.shares)
        ? payload.shares
        : [{ partnerName: payload.partnerName, percentage: payload.percentage, amount: payload.amount }]

      const shares = rawShares
        .map((share) => ({
          partnerName: normalizeText(share?.partnerName),
          percentage: normalizeAmount(share?.percentage),
          amount: normalizeAmount(share?.amount),
        }))
        .filter((share) => share.partnerName || share.percentage || share.amount)

      if (!shares.length) throw new Error('Informe pelo menos um sócio para o repasse')

      const normalizedPartnerNames = new Set()
      for (const share of shares) {
        if (!share.partnerName) throw new Error('Cada repasse precisa ter um sócio definido')
        if (share.percentage <= 0 && share.amount <= 0) throw new Error('Cada repasse precisa ter percentual ou valor maior que zero')
        const normalizedName = share.partnerName.toLowerCase()
        if (normalizedPartnerNames.has(normalizedName)) throw new Error('Não repita o mesmo sócio no mesmo repasse dividido')
        normalizedPartnerNames.add(normalizedName)
      }

      let subprojectAmount = 0
      if (subprojectId) {
        const spResult = await db.execute({
          sql: 'SELECT project_id, amount FROM subprojects WHERE id = ?',
          args: [subprojectId],
        })
        const sp = spResult.rows[0]
        if (!sp) throw new Error('Subprojeto não encontrado')
        projectId = String(sp.project_id)
        subprojectAmount = Number(sp.amount) || 0
      }

      if (!projectId) throw new Error('projectId ou subprojectId é obrigatório')

      const percentageTotal = shares.reduce((sum, share) => sum + (share.percentage || 0), 0)
      if (percentageTotal > 100) throw new Error('A soma dos percentuais do repasse não pode passar de 100%')

      for (const share of shares) {
        const amount = subprojectId && share.percentage
          ? subprojectAmount * share.percentage / 100
          : share.amount

        if (amount <= 0) throw new Error('O valor calculado do repasse precisa ser maior que zero')

        await db.execute({
          sql: `INSERT INTO partner_payouts (id, project_id, subproject_id, partner_name, percentage, amount, bank_account, paid_at, note, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            createId('payout'),
            projectId,
            subprojectId,
            share.partnerName,
            share.percentage || null,
            amount,
            normalizeText(payload.bankAccount),
            normalizeText(payload.entryDate) || timestamp,
            normalizeText(payload.note),
            actor,
            timestamp,
          ],
        })
      }
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, projectId],
      })
      return { ok: true }
    }

    case 'uploadLeadProposal': {
      const leadId = normalizeText(payload.leadId)
      const filename = normalizeText(payload.filename)
      const fileData = normalizeText(payload.fileData)
      const size = Number(payload.size) || 0

      if (!leadId || !filename || !fileData) {
        throw new Error('leadId, filename e fileData sÃ£o obrigatÃ³rios')
      }

      await db.execute({
        sql: `INSERT INTO lead_proposals (lead_id, filename, file_data, size, uploaded_at, uploaded_by)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(lead_id) DO UPDATE SET
                filename = excluded.filename,
                file_data = excluded.file_data,
                size = excluded.size,
                uploaded_at = excluded.uploaded_at,
                uploaded_by = excluded.uploaded_by`,
        args: [leadId, filename, fileData, size, timestamp, actor || null],
      })

      await db.execute({
        sql: 'UPDATE leads SET proposal_filename = ?, updated_at = ? WHERE id = ?',
        args: [filename, timestamp, leadId],
      })

      break
    }

    case 'deleteLeadProposal': {
      const leadId = normalizeText(payload.leadId)
      if (!leadId) throw new Error('leadId Ã© obrigatÃ³rio')

      await db.execute({ sql: 'DELETE FROM lead_proposals WHERE lead_id = ?', args: [leadId] })
      await db.execute({
        sql: 'UPDATE leads SET proposal_filename = NULL, updated_at = ? WHERE id = ?',
        args: [timestamp, leadId],
      })

      break
    }

    case 'deleteReceipt': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id Ã© obrigatÃ³rio')
      await db.execute({ sql: 'DELETE FROM payment_receipts WHERE id = ?', args: [id] })
      break
    }

    case 'deleteExpense': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id Ã© obrigatÃ³rio')
      await db.execute({ sql: 'DELETE FROM project_expenses WHERE id = ?', args: [id] })
      break
    }

    case 'deletePayout': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id Ã© obrigatÃ³rio')
      await db.execute({ sql: 'DELETE FROM partner_payouts WHERE id = ?', args: [id] })
      break
    }

    case 'updateReceipt': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id Ã© obrigatÃ³rio')
      await db.execute({
        sql: `UPDATE payment_receipts SET amount = ?, bank_account = ?, received_at = ?, note = ? WHERE id = ?`,
        args: [
          normalizeAmount(payload.amount),
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.note),
          id,
        ],
      })
      break
    }

    case 'updateExpense': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id Ã© obrigatÃ³rio')
      await db.execute({
        sql: `UPDATE project_expenses SET amount = ?, category = ?, vendor = ?, bank_account = ?, paid_at = ?, note = ?, project_id = ? WHERE id = ?`,
        args: [
          normalizeAmount(payload.amount),
          normalizeText(payload.category),
          normalizeText(payload.vendor),
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.note),
          normalizeText(payload.projectId) || null,
          id,
        ],
      })
      break
    }

    case 'updatePayout': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id Ã© obrigatÃ³rio')
      await db.execute({
        sql: `UPDATE partner_payouts SET amount = ?, partner_name = ?, bank_account = ?, paid_at = ?, note = ? WHERE id = ?`,
        args: [
          normalizeAmount(payload.amount),
          normalizeText(payload.partnerName),
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.note),
          id,
        ],
      })
      break
    }

    case 'deleteSubproject': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id é obrigatório')

      // Grab the parent project id before deleting so we can re-sync
      const delSpResult = await db.execute({ sql: 'SELECT project_id FROM subprojects WHERE id = ?', args: [id] })
      const delSpProjectId = delSpResult.rows[0]?.project_id ?? null

      await db.execute({ sql: 'DELETE FROM subproject_comments WHERE subproject_id = ?', args: [id] })
      await db.execute({ sql: 'DELETE FROM partner_payouts WHERE subproject_id = ?', args: [id] })
      await db.execute({ sql: 'DELETE FROM subprojects WHERE id = ?', args: [id] })

      // Re-sync parent project stage after deletion
      if (delSpProjectId) {
        const remainSp = await db.execute({ sql: 'SELECT stage FROM subprojects WHERE project_id = ?', args: [delSpProjectId] })
        const remainStages = remainSp.rows.map((r) => String(r.stage))
        if (remainStages.length === 0) {
          // No subprojects left — fall back to aguardar
          await db.execute({ sql: "UPDATE projects SET stage = 'aguardar', updated_at = ? WHERE id = ?", args: [timestamp, delSpProjectId] })
        } else {
          const allDone = remainStages.every((s) => s === 'concluído')
          const hasActive = remainStages.some((s) => s !== 'a-fazer' && s !== 'concluído')
          let nextStage = 'aguardar'
          if (allDone) nextStage = 'concluído'
          else if (hasActive) nextStage = 'em-andamento'
          else nextStage = 'em-andamento'

          const projStageResult = await db.execute({ sql: 'SELECT stage FROM projects WHERE id = ?', args: [delSpProjectId] })
          const curStage = String(projStageResult.rows[0]?.stage ?? '')
          if (curStage !== nextStage) {
            await db.execute({ sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?', args: [nextStage, timestamp, delSpProjectId] })
          }
        }
      }

      break
    }

    case 'savePremiseQuestionnaire': {
      const id = normalizeText(payload.id)
      const respondentName = normalizeText(payload.respondentName)
      const contactInfo = normalizeText(payload.contactInfo)
      const identificationNote = normalizeText(payload.identificationNote)
      if (!respondentName && !contactInfo && !identificationNote) {
        throw new Error('Informe ao menos uma forma de identificar a residência')
      }

      const answersJson = JSON.stringify(normalizeAnswers(payload.answers))
      const status = normalizeText(payload.status) || 'completed'
      if (id) {
        await db.execute({
          sql: `UPDATE premise_questionnaires
                SET respondent_name = ?,
                    contact_info = ?,
                    identification_note = ?,
                    answers_json = ?,
                    status = ?,
                    updated_at = ?,
                    completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, ?) ELSE completed_at END
                WHERE id = ?`,
          args: [respondentName, contactInfo, identificationNote, answersJson, status, timestamp, status, timestamp, id],
        })
      } else {
        await db.execute({
          sql: `INSERT INTO premise_questionnaires (
                  id, respondent_name, contact_info, identification_note, answers_json,
                  status, created_by, created_at, updated_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [createId('premise'), respondentName, contactInfo, identificationNote, answersJson, status, actor, timestamp, timestamp, status === 'completed' ? timestamp : null],
        })
      }
      return { ok: true }
    }

    case 'deletePremiseQuestionnaire': {
      const id = normalizeText(payload.id)
      if (!id) throw new Error('id é obrigatório')
      await db.execute({ sql: 'DELETE FROM premise_questionnaires WHERE id = ?', args: [id] })
      return { ok: true }
    }

    case 'createRevision': {
      const revisionId = createId('rev')
      await db.execute({
        sql: `INSERT INTO revisions (id, client_name, description, project_id, responsible_partner, deadline, delivery_date, stage, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          revisionId,
          normalizeText(payload.clientName),
          normalizeText(payload.description),
          normalizeText(payload.projectId) || null,
          normalizeText(payload.responsiblePartner),
          normalizeDate(payload.deadline),
          normalizeDate(payload.deliveryDate),
          normalizeText(payload.stage) || 'pendente',
          timestamp,
        ],
      })
      return { ok: true }
    }

    case 'updateRevision': {
      const revId = normalizeText(payload.id)
      if (!revId) throw new Error('id é obrigatório')
      await db.execute({
        sql: `UPDATE revisions
              SET client_name = ?,
                  description = ?,
                  project_id = ?,
                  responsible_partner = ?,
                  deadline = ?,
                  delivery_date = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.clientName),
          normalizeText(payload.description),
          normalizeText(payload.projectId) || null,
          normalizeText(payload.responsiblePartner),
          normalizeDate(payload.deadline),
          normalizeDate(payload.deliveryDate),
          revId,
        ],
      })
      return { ok: true }
    }

    case 'updateRevisionStage': {
      const revStageId = normalizeText(payload.id)
      const revNewStage = normalizeText(payload.stage)
      if (!revStageId) throw new Error('id é obrigatório')

      if (revNewStage === 'concluída' && payload.deliveryDate) {
        await db.execute({
          sql: `UPDATE revisions SET stage = ?, delivery_date = ?, created_at = created_at WHERE id = ?`,
          args: [revNewStage, normalizeDate(payload.deliveryDate), revStageId],
        })
      } else {
        await db.execute({
          sql: `UPDATE revisions SET stage = ? WHERE id = ?`,
          args: [revNewStage, revStageId],
        })
      }
      return { ok: true }
    }

    case 'deleteRevision': {
      const delRevId = normalizeText(payload.id)
      if (!delRevId) throw new Error('id é obrigatório')
      await db.execute({ sql: 'DELETE FROM revisions WHERE id = ?', args: [delRevId] })
      return { ok: true }
    }

    case 'deleteProject': {
      const projectId = normalizeText(payload.projectId)
      if (!projectId) throw new Error('projectId é obrigatório')

      const spResult = await db.execute({ sql: 'SELECT id FROM subprojects WHERE project_id = ?', args: [projectId] })
      const spIds = spResult.rows.map((r) => r.id)

      for (const spId of spIds) {
        await db.execute({ sql: 'DELETE FROM subproject_comments WHERE subproject_id = ?', args: [spId] })
      }

      await db.execute({ sql: 'DELETE FROM partner_payouts WHERE subproject_id IN (SELECT id FROM subprojects WHERE project_id = ?)', args: [projectId] })
      await db.execute({ sql: 'DELETE FROM subprojects WHERE project_id = ?', args: [projectId] })
      await db.execute({ sql: 'DELETE FROM project_logs WHERE project_id = ?', args: [projectId] })
      await db.execute({ sql: 'DELETE FROM project_expenses WHERE project_id = ?', args: [projectId] })
      await db.execute({ sql: 'DELETE FROM payment_receipts WHERE project_id = ?', args: [projectId] })
      await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [projectId] })

      break
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
