export type SessionUser = {
  email: string
  name: string
}

export type Summary = {
  openLeads: number
  activeProjects: number
  contractTotal: number
  receivedTotal: number
  expenseTotal: number
  payoutTotal: number
  netCash: number
  outstandingTotal: number
  activeContractTotal: number
  currentYearSales: number
  deliveredUnpaidTotal: number
}

export type Lead = {
  id: string
  title: string
  stage: string
  source: string | null
  estimated_amount: number
  sales_owner: string | null
  notes: string | null
  inbound_at: string | null
  first_contact_at: string | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  proposal_sent_at: string | null
  closed_at: string | null
  created_at: string
  client_name: string | null
}

export type Project = {
  id: string
  name: string
  code: string | null
  discipline: string | null
  stage: string
  contract_amount: number
  sales_owner: string | null
  sales_bonus_percent: number
  base_partner_split_percent: number
  deadline: string | null
  status_note: string | null
  created_at: string
  updated_at: string
  client_name: string | null
  total_received: number
  total_expenses: number
  total_payouts: number
  pending_count: number
  next_pending_due: string | null
}

export type ProjectLog = {
  id: string
  project_id: string
  log_type: string
  title: string
  details: string | null
  due_date: string | null
  status: string
  created_by: string | null
  created_at: string
  project_name: string
}

export type Receipt = {
  id: string
  project_id: string
  amount: number
  bank_account: string | null
  received_at: string
  note: string | null
  created_by: string | null
  project_name: string
}

export type Expense = {
  id: string
  project_id: string
  amount: number
  category: string | null
  bank_account: string | null
  paid_at: string
  vendor: string | null
  note: string | null
  created_by: string | null
  project_name: string
}

export type Payout = {
  id: string
  project_id: string
  partner_name: string
  amount: number
  bank_account: string | null
  paid_at: string
  note: string | null
  created_by: string | null
  project_name: string
}

export type CashflowEntry = {
  id: string
  project_id: string
  amount: number
  entry_date: string
  bank_account: string | null
  note: string | null
  entry_type: 'receipt' | 'expense' | 'payout'
  project_name: string
  signed_amount: number
  counterpart: string | null
}

export type BootstrapData = {
  user: SessionUser
  summary: Summary
  leads: Lead[]
  projects: Project[]
  logs: ProjectLog[]
  receipts: Receipt[]
  expenses: Expense[]
  payouts: Payout[]
  cashflow: CashflowEntry[]
}
