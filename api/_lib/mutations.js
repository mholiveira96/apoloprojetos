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
          normalizeText(payload.stage) || 'aguardar',
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
                  notes = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.name),
          normalizeText(payload.code),
          normalizeText(payload.discipline),
          normalizeText(payload.stage) || 'aguardar',
          normalizeAmount(payload.contractAmount),
          normalizeText(payload.salesOwner),
          normalizeDate(payload.deadline),
          normalizeText(payload.statusNote),
          payload.notes != null ? String(payload.notes) : null,
          timestamp,
          normalizeText(payload.id),
        ],
      })
      return { ok: true }
    }

    case 'createProjectFromLead': {
      const leadResult = await db.execute({
        sql: 'SELECT * FROM leads WHERE id = ?',
        args: [normalizeText(payload.leadId)],
      })
      const lead = leadResult.rows[0]
      if (!lead) throw new Error('Lead não encontrado')

      const contractAmount = normalizeAmount(payload.contractAmount) || Number(lead.estimated_amount ?? 0)
      const projectId = createId('project')
      const clientId = lead.client_id ?? null
      const contractedAt = normalizeDate(payload.closedAt) || todayIsoDate()

      await db.execute({
        sql: `INSERT INTO projects (
                id, client_id, name, code, discipline, stage, contract_amount,
                sales_owner, sales_bonus_percent, base_partner_split_percent,
                deadline, status_note, lead_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, 'aguardar', ?, ?, 10, 50, ?, ?, ?, ?, ?)`,
        args: [
          projectId,
          clientId,
          normalizeText(payload.name) || String(lead.title ?? ''),
          normalizeText(payload.code),
          null,
          contractAmount,
          normalizeText(payload.salesOwner) || String(lead.sales_owner ?? ''),
          normalizeDate(payload.deadline),
          normalizeText(payload.statusNote),
          normalizeText(payload.leadId),
          timestamp,
          timestamp,
        ],
      })

      // Create subprojects from payload
      const subprojects = payload.subprojects
      if (Array.isArray(subprojects) && subprojects.length > 0) {
        for (const sp of subprojects) {
          await db.execute({
            sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, contracted_at, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'a-fazer', ?, ?, ?, ?)`,
            args: [
              createId('sp'),
              projectId,
              normalizeText(sp.discipline),
              normalizeAmount(sp.amount),
              normalizeText(sp.responsiblePartner),
              contractedAt,
              timestamp,
              timestamp,
            ],
          })
        }
      }

      await db.execute({
        sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
              VALUES (?, ?, 'note', 'Contratação registrada', ?, ?, 'done', ?, ?)`,
        args: [
          createId('log'),
          projectId,
          'Gerado automaticamente na conversão do lead para projeto.',
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
      if (!spProjectId) throw new Error('projectId é obrigatório')
      await db.execute({
        sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('sp'),
          spProjectId,
          normalizeText(payload.discipline),
          normalizeAmount(payload.amount),
          normalizeText(payload.stage) || 'a-fazer',
          normalizeText(payload.responsiblePartner),
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
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.discipline),
          normalizeAmount(payload.amount),
          normalizeText(payload.responsiblePartner),
          timestamp,
          spId,
        ],
      })
      return { ok: true }
    }

    case 'updateSubprojectStage': {
      const subId = normalizeText(payload.id)
      const newStage = normalizeText(payload.stage)
      const spProjectId = normalizeText(payload.projectId)
      const completedAt = normalizeDate(payload.completedAt)

      if (newStage === 'concluído' && !completedAt) {
        throw new Error('Data de conclusão é obrigatória')
      }

      await db.execute({
        sql: 'UPDATE subprojects SET stage = ?, updated_at = ? WHERE id = ?',
        args: [newStage, timestamp, subId],
      })

      if (newStage === 'concluído') {
        const subprojectResult = await db.execute({
          sql: 'SELECT discipline FROM subprojects WHERE id = ?',
          args: [subId],
        })
        const discipline = normalizeText(subprojectResult.rows[0]?.discipline)
        await db.execute({
          sql: `INSERT INTO project_logs (id, project_id, log_type, title, details, due_date, status, created_by, created_at)
                VALUES (?, ?, 'delivery', 'Entrega concluída', ?, ?, 'done', ?, ?)`,
          args: [
            createId('log'),
            spProjectId,
            discipline ? `Subprojeto concluído: ${discipline}.` : 'Subprojeto concluído.',
            completedAt,
            actor,
            timestamp,
          ],
        })
      }

      // Auto-transition project stage (forward only)
      if (spProjectId) {
        const allSp = await db.execute({
          sql: 'SELECT stage FROM subprojects WHERE project_id = ?',
          args: [spProjectId],
        })
        const stages = allSp.rows.map(r => String(r.stage))
        const anyStarted = stages.some(s => s !== 'a-fazer')
        const allDone = stages.length > 0 && stages.every(s => s === 'concluído')

        const projectResult = await db.execute({
          sql: 'SELECT stage, contract_amount FROM projects WHERE id = ?',
          args: [spProjectId],
        })
        const project = projectResult.rows[0]
        if (!project) return { ok: true }

        const currentStage = String(project.stage)

        if (anyStarted && currentStage === 'aguardar') {
          await db.execute({
            sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?',
            args: ['em-andamento', timestamp, spProjectId],
          })
        } else if (allDone && (currentStage === 'em-andamento' || currentStage === 'aguardar')) {
          // Check if fully paid
          const received = await db.execute({
            sql: 'SELECT COALESCE(SUM(amount), 0) AS total FROM payment_receipts WHERE project_id = ?',
            args: [spProjectId],
          })
          const totalReceived = Number(received.rows[0]?.total ?? 0)
          const contractAmount = Number(project.contract_amount ?? 0)

          const nextProjectStage = totalReceived >= contractAmount
            ? 'concluído'
            : 'concluído-aguardando-pagamento'
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
      if (!receiptProjectId) throw new Error('projectId é obrigatório')

      const projectRow = await db.execute({
        sql: 'SELECT client_id FROM projects WHERE id = ?',
        args: [receiptProjectId],
      })
      if (!projectRow.rows[0]) throw new Error('Projeto não encontrado')

      let receiptClientId = projectRow.rows[0].client_id ? String(projectRow.rows[0].client_id) : null
      if (!receiptClientId) {
        receiptClientId = await upsertClient(normalizeText(payload.clientName), payload)
      }
      if (!receiptClientId) throw new Error('Cliente não encontrado para o projeto')

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
      const allDone2 = allSp2.rows.length > 0 && allSp2.rows.every((r) => String(r.stage) === 'concluído')
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
        if (p2 && ['em-andamento', 'concluído-aguardando-pagamento'].includes(String(p2.stage))) {
          const totalReceived2 = Number(received2.rows[0]?.total ?? 0)
          const contractAmount2 = Number(p2.contract_amount ?? 0)
          if (totalReceived2 >= contractAmount2) {
            await db.execute({
              sql: 'UPDATE projects SET stage = ?, updated_at = ? WHERE id = ?',
              args: ['concluído', timestamp, receiptProjectId],
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
      let partnerName = normalizeText(payload.partnerName)
      const percentage = normalizeAmount(payload.percentage) || null
      let amount = normalizeAmount(payload.amount)

      if (subprojectId) {
        const spResult = await db.execute({
          sql: 'SELECT project_id, responsible_partner, amount FROM subprojects WHERE id = ?',
          args: [subprojectId],
        })
        const sp = spResult.rows[0]
        if (!sp) throw new Error('Subprojeto não encontrado')
        projectId = String(sp.project_id)
        if (!partnerName) partnerName = String(sp.responsible_partner)
        if (percentage) amount = Number(sp.amount) * percentage / 100
      }

      if (!projectId) throw new Error('projectId ou subprojectId é obrigatório')

      await db.execute({
        sql: `INSERT INTO partner_payouts (id, project_id, subproject_id, partner_name, percentage, amount, bank_account, paid_at, note, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('payout'),
          projectId,
          subprojectId,
          partnerName,
          percentage,
          amount,
          normalizeText(payload.bankAccount),
          normalizeText(payload.entryDate) || timestamp,
          normalizeText(payload.note),
          actor,
          timestamp,
        ],
      })
      await db.execute({
        sql: 'UPDATE projects SET updated_at = ? WHERE id = ?',
        args: [timestamp, projectId],
      })
      return { ok: true }
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
