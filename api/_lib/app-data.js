import { ensureSchema, getDb } from './db.js'

function asNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

export async function getBootstrapData() {
  await ensureSchema()
  const db = getDb()

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
  ] = await Promise.all([
    db.execute(`SELECT COUNT(*) AS total FROM leads WHERE stage NOT IN ('won', 'lost')`),
    db.execute(`SELECT COUNT(*) AS total FROM projects WHERE stage NOT IN ('closed')`),
    db.execute(`
      SELECT
        COALESCE((SELECT SUM(contract_amount) FROM projects), 0) AS contract_total,
        COALESCE((SELECT SUM(amount) FROM payment_receipts), 0) AS received_total,
        COALESCE((SELECT SUM(amount) FROM project_expenses), 0) AS expense_total,
        COALESCE((SELECT SUM(amount) FROM partner_payouts), 0) AS payout_total,
        COALESCE((SELECT SUM(contract_amount) FROM projects), 0) - COALESCE((SELECT SUM(amount) FROM payment_receipts), 0) AS outstanding_total
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
        projects.discipline,
        projects.stage,
        projects.contract_amount,
        projects.sales_owner,
        projects.sales_bonus_percent,
        projects.base_partner_split_percent,
        projects.deadline,
        projects.status_note,
        projects.created_at,
        projects.updated_at,
        clients.name AS client_name,
        COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE project_id = projects.id), 0) AS total_received,
        COALESCE((SELECT SUM(amount) FROM project_expenses WHERE project_id = projects.id), 0) AS total_expenses,
        COALESCE((SELECT SUM(amount) FROM partner_payouts WHERE project_id = projects.id), 0) AS total_payouts,
        COALESCE((SELECT COUNT(*) FROM project_logs WHERE project_id = projects.id AND log_type = 'pending' AND status != 'done'), 0) AS pending_count,
        (SELECT MIN(due_date) FROM project_logs WHERE project_id = projects.id AND log_type = 'pending' AND status != 'done' AND due_date IS NOT NULL) AS next_pending_due
      FROM projects
      LEFT JOIN clients ON clients.id = projects.client_id
      ORDER BY CASE projects.stage
        WHEN 'in-progress' THEN 1
        WHEN 'waiting-files' THEN 2
        WHEN 'review' THEN 3
        WHEN 'proposal' THEN 4
        WHEN 'closed' THEN 5
        ELSE 6
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
        payment_receipts.project_id,
        payment_receipts.amount,
        payment_receipts.bank_account,
        payment_receipts.received_at,
        payment_receipts.note,
        payment_receipts.created_by,
        projects.name AS project_name
      FROM payment_receipts
      INNER JOIN projects ON projects.id = payment_receipts.project_id
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
      INNER JOIN projects ON projects.id = project_expenses.project_id
      ORDER BY project_expenses.paid_at DESC
      LIMIT 40
    `),
    db.execute(`
      SELECT
        partner_payouts.id,
        partner_payouts.project_id,
        partner_payouts.partner_name,
        partner_payouts.amount,
        partner_payouts.bank_account,
        partner_payouts.paid_at,
        partner_payouts.note,
        partner_payouts.created_by,
        projects.name AS project_name
      FROM partner_payouts
      INNER JOIN projects ON projects.id = partner_payouts.project_id
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
          projects.name AS project_name,
          payment_receipts.amount AS signed_amount,
          NULL AS counterpart
        FROM payment_receipts
        INNER JOIN projects ON projects.id = payment_receipts.project_id

        UNION ALL

        SELECT
          project_expenses.id,
          project_expenses.project_id,
          project_expenses.amount,
          project_expenses.paid_at AS entry_date,
          project_expenses.bank_account,
          project_expenses.note,
          'expense' AS entry_type,
          projects.name AS project_name,
          project_expenses.amount * -1 AS signed_amount,
          COALESCE(project_expenses.vendor, project_expenses.category) AS counterpart
        FROM project_expenses
        INNER JOIN projects ON projects.id = project_expenses.project_id

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
          partner_payouts.partner_name AS counterpart
        FROM partner_payouts
        INNER JOIN projects ON projects.id = partner_payouts.project_id
      )
      ORDER BY entry_date DESC
      LIMIT 80
    `),
  ])

  const financial = financialSummaryResult.rows[0] ?? {}
  const contractTotal = asNumber(financial.contract_total)
  const receivedTotal = asNumber(financial.received_total)
  const expenseTotal = asNumber(financial.expense_total)
  const payoutTotal = asNumber(financial.payout_total)
  const outstandingTotal = asNumber(financial.outstanding_total)

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
    },
    leads: leadsResult.rows,
    projects: projectsResult.rows,
    logs: logsResult.rows,
    receipts: receiptsResult.rows,
    expenses: expensesResult.rows,
    payouts: payoutsResult.rows,
    cashflow: cashflowResult.rows,
  }
}
