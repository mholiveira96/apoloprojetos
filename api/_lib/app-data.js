import { ensureSchema, getDb } from './db.js'

function asNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function parseAnswers(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function hasColumn(db, tableName, columnName) {
  try {
    await db.execute(`SELECT ${columnName} FROM ${tableName} LIMIT 0`)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('no such column') || message.includes('has no column named')) return false
    throw error
  }
}

export async function getBootstrapData() {
  await ensureSchema()
  const db = getDb()
  const hasSubprojectArea = await hasColumn(db, 'subprojects', 'area')

  const [
    leadCountResult,
    activeProjectsResult,
    financialSummaryResult,
    leadsResult,
    projectsResult,
    logsResult,
    receiptsResult,
    expensesResult,
    payoutsResult,
    cashflowResult,
    subprojectsResult,
    subprojectCommentsResult,
    projectDriveFilesResult,
    revisionsResult,
    premiseQuestionnairesResult,
  ] = await Promise.all([
    db.execute(`SELECT COUNT(*) AS total FROM leads WHERE stage NOT IN ('won', 'lost')`),
    db.execute(`SELECT COUNT(*) AS total FROM projects WHERE stage NOT IN ('concluÃ­do')`),
    db.execute(`
      SELECT
        COALESCE((SELECT SUM(contract_amount) FROM projects), 0) AS contract_total,
        COALESCE((SELECT SUM(amount) FROM payment_receipts), 0) AS received_total,
        COALESCE((SELECT SUM(amount) FROM project_expenses), 0) AS expense_total,
        COALESCE((SELECT SUM(amount) FROM partner_payouts), 0) AS payout_total,
        COALESCE((SELECT SUM(contract_amount) FROM projects), 0) - COALESCE((SELECT SUM(amount) FROM payment_receipts), 0) AS outstanding_total,
        COALESCE((SELECT SUM(contract_amount) FROM projects WHERE stage != 'concluÃ­do'), 0) AS active_contract_total,
        COALESCE((
          SELECT SUM(projects.contract_amount)
          FROM projects
          WHERE (
            EXISTS (
              SELECT 1
              FROM project_logs
              WHERE project_logs.project_id = projects.id
                AND project_logs.title IN ('Contratação registrada', 'ContrataÃ§Ã£o registrada', 'ContrataÃƒÂ§ÃƒÂ£o registrada')
                AND substr(project_logs.due_date, 1, 4) = strftime('%Y', 'now')
            )
            OR (
              NOT EXISTS (
                SELECT 1
                FROM project_logs
                WHERE project_logs.project_id = projects.id
                  AND project_logs.title IN ('Contratação registrada', 'ContrataÃ§Ã£o registrada', 'ContrataÃƒÂ§ÃƒÂ£o registrada')
              )
              AND substr(projects.created_at, 1, 4) = strftime('%Y', 'now')
            )
          )
        ), 0) AS current_year_sales,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN projects.contract_amount - COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE project_id = projects.id), 0) > 0
                THEN projects.contract_amount - COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE project_id = projects.id), 0)
              ELSE 0
            END
          )
          FROM projects
          WHERE projects.stage = 'concluÃ­do'
        ), 0) AS delivered_unpaid_total
    `),
    db.execute(`
      SELECT
        leads.id,
        leads.title,
        leads.stage,
        leads.source,
        leads.estimated_amount,
        leads.sales_owner,
        leads.notes,
        leads.inbound_at,
        leads.first_contact_at,
        leads.last_contact_at,
        leads.next_follow_up_at,
        leads.proposal_sent_at,
        leads.closed_at,
        leads.created_at,
        leads.proposal_filename,
        clients.name AS client_name
      FROM leads
      LEFT JOIN clients ON clients.id = leads.client_id
      ORDER BY
        CASE
          WHEN leads.stage NOT IN ('won', 'lost') AND leads.next_follow_up_at IS NOT NULL AND leads.next_follow_up_at < date('now') THEN 0
          WHEN leads.stage NOT IN ('won', 'lost') AND leads.next_follow_up_at IS NOT NULL THEN 1
          WHEN leads.stage NOT IN ('won', 'lost') THEN 2
          ELSE 3
        END,
        COALESCE(leads.next_follow_up_at, leads.inbound_at, substr(leads.created_at, 1, 10)) ASC,
        leads.updated_at DESC
      LIMIT 80
    `),
    db.execute(`
      SELECT
        projects.id,
        projects.name,
        projects.code,
        projects.area,
        projects.discipline,
        projects.stage,
        projects.archived,
        projects.contract_amount,
        projects.sales_owner,
        projects.sales_bonus_percent,
        projects.base_partner_split_percent,
        projects.deadline,
        projects.drive_enabled,
        projects.drive_token,
        projects.drive_updated_at,
        projects.status_note,
        projects.notes,
        projects.lead_id,
        projects.created_at,
        projects.updated_at,
        clients.name AS client_name,
        (SELECT COUNT(*)
          FROM project_logs
          WHERE project_logs.project_id = projects.id
            AND project_logs.title IN ('Contratação registrada', 'ContrataÃ§Ã£o registrada', 'ContrataÃƒÂ§ÃƒÂ£o registrada')) AS sale_log_count,
        (SELECT MAX(COALESCE(project_logs.due_date, project_logs.created_at))
          FROM project_logs
          WHERE project_logs.project_id = projects.id
            AND project_logs.title IN ('Contratação registrada', 'ContrataÃ§Ã£o registrada', 'ContrataÃƒÂ§ÃƒÂ£o registrada')) AS sale_recorded_at,
        (SELECT MAX(project_logs.due_date)
          FROM project_logs
          WHERE project_logs.project_id = projects.id
            AND project_logs.log_type = 'delivery'
            AND project_logs.status = 'done') AS latest_subproject_completed_at,
        COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE project_id = projects.id), 0) AS total_received,
        COALESCE((SELECT SUM(amount) FROM project_expenses WHERE project_id = projects.id), 0) AS total_expenses,
        COALESCE((SELECT SUM(amount) FROM partner_payouts WHERE project_id = projects.id), 0) AS total_payouts,
        COALESCE((SELECT COUNT(*) FROM project_logs WHERE project_id = projects.id AND log_type = 'pending' AND status != 'done'), 0) AS pending_count,
        (SELECT MIN(due_date) FROM project_logs WHERE project_id = projects.id AND log_type = 'pending' AND status != 'done' AND due_date IS NOT NULL) AS next_pending_due
      FROM projects
      LEFT JOIN clients ON clients.id = projects.client_id
      ORDER BY CASE projects.stage
        WHEN 'em-andamento' THEN 1
        WHEN 'aguardar' THEN 2
        WHEN 'concluÃ­do-aguardando-pagamento' THEN 3
        WHEN 'concluÃ­do' THEN 4
        ELSE 5
      END, projects.updated_at DESC
    `),
    db.execute(`
      SELECT
        project_logs.id,
        project_logs.project_id,
        project_logs.log_type,
        project_logs.title,
        project_logs.details,
        project_logs.due_date,
        project_logs.status,
        project_logs.created_by,
        project_logs.created_at,
        projects.name AS project_name
      FROM project_logs
      INNER JOIN projects ON projects.id = project_logs.project_id
      ORDER BY COALESCE(project_logs.due_date, project_logs.created_at) DESC
      LIMIT 40
    `),
    db.execute(`
      SELECT
        payment_receipts.id,
        payment_receipts.client_id,
        payment_receipts.project_id,
        payment_receipts.amount,
        payment_receipts.bank_account,
        payment_receipts.received_at,
        payment_receipts.note,
        payment_receipts.created_by,
        clients.name AS client_name,
        projects.name AS project_name
      FROM payment_receipts
      INNER JOIN clients ON clients.id = payment_receipts.client_id
      LEFT JOIN projects ON projects.id = payment_receipts.project_id
      ORDER BY payment_receipts.received_at DESC
      LIMIT 40
    `),
    db.execute(`
      SELECT
        project_expenses.id,
        project_expenses.project_id,
        project_expenses.amount,
        project_expenses.category,
        project_expenses.bank_account,
        project_expenses.paid_at,
        project_expenses.vendor,
        project_expenses.note,
        project_expenses.created_by,
        projects.name AS project_name
      FROM project_expenses
      LEFT JOIN projects ON projects.id = project_expenses.project_id
      ORDER BY project_expenses.paid_at DESC
      LIMIT 40
    `),
    db.execute(`
      SELECT
        partner_payouts.id,
        partner_payouts.project_id,
        partner_payouts.subproject_id,
        partner_payouts.partner_name,
        partner_payouts.percentage,
        partner_payouts.amount,
        partner_payouts.bank_account,
        partner_payouts.paid_at,
        partner_payouts.note,
        partner_payouts.created_by,
        projects.name AS project_name,
        subprojects.discipline AS discipline
      FROM partner_payouts
      INNER JOIN projects ON projects.id = partner_payouts.project_id
      LEFT JOIN subprojects ON subprojects.id = partner_payouts.subproject_id
      ORDER BY partner_payouts.paid_at DESC
      LIMIT 40
    `),
    db.execute(`
      SELECT * FROM (
        SELECT
          payment_receipts.id,
          payment_receipts.project_id,
          payment_receipts.amount,
          payment_receipts.received_at AS entry_date,
          payment_receipts.bank_account,
          payment_receipts.note,
          'receipt' AS entry_type,
          COALESCE(projects.name, clients.name) AS project_name,
          payment_receipts.amount AS signed_amount,
          clients.name AS counterpart
        FROM payment_receipts
        INNER JOIN clients ON clients.id = payment_receipts.client_id
        LEFT JOIN projects ON projects.id = payment_receipts.project_id

        UNION ALL

        SELECT
          project_expenses.id,
          project_expenses.project_id,
          project_expenses.amount,
          project_expenses.paid_at AS entry_date,
          project_expenses.bank_account,
          project_expenses.note,
          'expense' AS entry_type,
          COALESCE(projects.name, project_expenses.category, 'Despesa geral') AS project_name,
          project_expenses.amount * -1 AS signed_amount,
          COALESCE(project_expenses.vendor, project_expenses.category) AS counterpart
        FROM project_expenses
        LEFT JOIN projects ON projects.id = project_expenses.project_id

        UNION ALL

        SELECT
          partner_payouts.id,
          partner_payouts.project_id,
          partner_payouts.amount,
          partner_payouts.paid_at AS entry_date,
          partner_payouts.bank_account,
          partner_payouts.note,
          'payout' AS entry_type,
          projects.name AS project_name,
          partner_payouts.amount * -1 AS signed_amount,
          CASE
            WHEN subprojects.discipline IS NOT NULL
            THEN partner_payouts.partner_name || ' Â· ' || subprojects.discipline
            ELSE partner_payouts.partner_name
          END AS counterpart
        FROM partner_payouts
        INNER JOIN projects ON projects.id = partner_payouts.project_id
        LEFT JOIN subprojects ON subprojects.id = partner_payouts.subproject_id
      )
      ORDER BY entry_date DESC
    `),
    db.execute(`
      SELECT
        subprojects.id,
        subprojects.project_id,
        subprojects.discipline,
        subprojects.amount,
        subprojects.stage,
        subprojects.responsible_partner,
        subprojects.deadline,
        subprojects.observacao,
        ${hasSubprojectArea ? 'subprojects.area' : 'NULL AS area'},
        subprojects.contracted_at,
        subprojects.created_at,
        subprojects.updated_at,
        projects.name AS project_name
      FROM subprojects
      INNER JOIN projects ON projects.id = subprojects.project_id
      ORDER BY subprojects.updated_at DESC
    `),
    db.execute(`
      SELECT
        subproject_comments.id,
        subproject_comments.subproject_id,
        subproject_comments.body,
        subproject_comments.created_by,
        subproject_comments.created_at
      FROM subproject_comments
      ORDER BY subproject_comments.created_at DESC
    `),
    db.execute(`
      SELECT
        project_drive_files.id,
        project_drive_files.project_id,
        project_drive_files.subproject_id,
        project_drive_files.filename,
        project_drive_files.blob_url,
        project_drive_files.blob_pathname,
        project_drive_files.content_type,
        project_drive_files.size_bytes,
        project_drive_files.uploaded_by,
        project_drive_files.created_at,
        projects.name AS project_name,
        subprojects.discipline AS subproject_discipline
      FROM project_drive_files
      INNER JOIN projects ON projects.id = project_drive_files.project_id
      LEFT JOIN subprojects ON subprojects.id = project_drive_files.subproject_id
      ORDER BY project_drive_files.created_at DESC
    `),
    db.execute(`
      SELECT
        revisions.id,
        revisions.client_name,
        revisions.description,
        revisions.project_id,
        revisions.responsible_partner,
        revisions.deadline,
        revisions.delivery_date,
        revisions.stage,
        revisions.created_at,
        projects.name AS project_name
      FROM revisions
      LEFT JOIN projects ON projects.id = revisions.project_id
      ORDER BY
        CASE revisions.stage
          WHEN 'pendente' THEN 0
          WHEN 'em-andamento' THEN 1
          WHEN 'bloqueado' THEN 2
          WHEN 'concluída' THEN 3
          ELSE 4
        END,
        COALESCE(revisions.deadline, revisions.created_at) ASC
    `),
    db.execute(`
      SELECT
        id,
        respondent_name,
        contact_info,
        identification_note,
        answers_json,
        status,
        created_by,
        created_at,
        updated_at,
        completed_at
      FROM premise_questionnaires
      ORDER BY updated_at DESC
    `),
  ])

  const financial = financialSummaryResult.rows[0] ?? {}
  const contractTotal = asNumber(financial.contract_total)
  const receivedTotal = asNumber(financial.received_total)
  const expenseTotal = asNumber(financial.expense_total)
  const payoutTotal = asNumber(financial.payout_total)
  const outstandingTotal = asNumber(financial.outstanding_total)
  const activeContractTotal = asNumber(financial.active_contract_total)
  const currentYearSales = asNumber(financial.current_year_sales)
  const deliveredUnpaidTotal = asNumber(financial.delivered_unpaid_total)
  const projects = projectsResult.rows.map((project) => ({
    ...project,
    archived: Boolean(asNumber(project.archived)),
    drive_enabled: Boolean(asNumber(project.drive_enabled)),
  }))

  return {
    summary: {
      openLeads: asNumber(leadCountResult.rows[0]?.total),
      activeProjects: asNumber(activeProjectsResult.rows[0]?.total),
      contractTotal,
      receivedTotal,
      expenseTotal,
      payoutTotal,
      netCash: receivedTotal - expenseTotal - payoutTotal,
      outstandingTotal,
      activeContractTotal,
      currentYearSales,
      deliveredUnpaidTotal,
    },
    leads: leadsResult.rows,
    projects,
    logs: logsResult.rows,
    receipts: receiptsResult.rows,
    expenses: expensesResult.rows,
    payouts: payoutsResult.rows,
    cashflow: cashflowResult.rows,
    subprojects: subprojectsResult.rows,
    subprojectComments: subprojectCommentsResult.rows,
    projectDriveFiles: projectDriveFilesResult.rows,
    revisions: revisionsResult.rows,
    premiseQuestionnaires: premiseQuestionnairesResult.rows.map((questionnaire) => ({
      ...questionnaire,
      answers: parseAnswers(questionnaire.answers_json),
    })),
  }
}
