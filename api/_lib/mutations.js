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
      const projectId = createId('project')
      const clientId = await upsertClient(normalizeText(payload.clientName), payload)
      await db.execute({
        sql: `INSERT INTO projects (
                id, client_id, name, code, discipline, stage, archived, contract_amount,
                sales_owner, sales_bonus_percent, base_partner_split_percent,
                status_note, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          projectId,
          clientId,
          normalizeText(payload.name),
          normalizeText(payload.code),
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
            sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, deadline, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'a-fazer', ?, ?, ?, ?)`,
            args: [createId('sp'), projectId, normalizeText(sp.discipline), normalizeAmount(sp.amount), normalizeText(sp.responsiblePartner), normalizeDate(sp.deadline), timestamp, timestamp],
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

    case 'updateProject': {
      await db.execute({
        sql: `UPDATE projects
              SET name = ?,
                  code = ?,
                  discipline = ?,
                  stage = ?,
                  contract_amount = ?,
                  sales_owner = ?,
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
      if (!lead) throw new Error('Lead nÃ£o encontrado')

      const contractAmount = normalizeAmount(payload.contractAmount) || Number(lead.estimated_amount ?? 0)
      const projectId = createId('project')
      const clientId = lead.client_id ?? null
      const contractedAt = normalizeDate(payload.closedAt) || todayIsoDate()

      await db.execute({
        sql: `INSERT INTO projects (
                id, client_id, name, code, discipline, stage, archived, contract_amount,
                sales_owner, sales_bonus_percent, base_partner_split_percent,
                status_note, lead_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, 'aguardar', ?, ?, ?, 10, 50, ?, ?, ?, ?)`,
        args: [
          projectId,
          clientId,
          normalizeText(payload.name) || String(lead.title ?? ''),
          normalizeText(payload.code),
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

      // Create subprojects from payload
      const subprojects = payload.subprojects
      if (Array.isArray(subprojects) && subprojects.length > 0) {
        for (const sp of subprojects) {
          await db.execute({
            sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, deadline, contracted_at, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'a-fazer', ?, ?, ?, ?, ?)`,
            args: [
              createId('sp'),
              projectId,
              normalizeText(sp.discipline),
              normalizeAmount(sp.amount),
              normalizeText(sp.responsiblePartner),
              normalizeDate(sp.deadline),
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
        sql: `INSERT INTO subprojects (id, project_id, discipline, amount, stage, responsible_partner, deadline, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId('sp'),
          spProjectId,
          normalizeText(payload.discipline),
          normalizeAmount(payload.amount),
          normalizeText(payload.stage) || 'a-fazer',
          normalizeText(payload.responsiblePartner),
          normalizeDate(payload.deadline),
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
                  updated_at = ?
              WHERE id = ?`,
        args: [
          normalizeText(payload.discipline),
          normalizeAmount(payload.amount),
          normalizeText(payload.responsiblePartner),
          normalizeDate(payload.deadline),
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
      let partnerName = normalizeText(payload.partnerName)
      const percentage = normalizeAmount(payload.percentage) || null
      let amount = normalizeAmount(payload.amount)

      if (subprojectId) {
        const spResult = await db.execute({
          sql: 'SELECT project_id, responsible_partner, amount FROM subprojects WHERE id = ?',
          args: [subprojectId],
        })
        const sp = spResult.rows[0]
        if (!sp) throw new Error('Subprojeto nÃ£o encontrado')
        projectId = String(sp.project_id)
        if (!partnerName) partnerName = String(sp.responsible_partner)
        if (percentage) amount = Number(sp.amount) * percentage / 100
      }

      if (!projectId) throw new Error('projectId ou subprojectId Ã© obrigatÃ³rio')

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

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
