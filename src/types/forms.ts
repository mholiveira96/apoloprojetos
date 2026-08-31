export type ViewMode = 'list' | 'kanban'

export type LeadDetailForm = {
  title: string
  stage: string
  source: string
  estimatedAmount: string
  salesOwner: string
  notes: string
  inboundAt: string
  firstContactAt: string
  lastContactAt: string
  nextFollowUpAt: string
  proposalSentAt: string
  closedAt: string
  subprojects: SubprojectEntry[]
}

export type LeadForm = {
  clientName: string
  title: string
  stage: string
  source: string
  estimatedAmount: string
  salesOwner: string
  notes: string
  inboundAt: string
  nextFollowUpAt: string
  subprojects: SubprojectEntry[]
}

export type ProjectForm = {
  clientName: string
  name: string
  code: string
  area: string
  discipline: string
  stage: string
  contractAmount: string
  salesOwner: string
  statusNote: string
}

export type LogForm = {
  projectId: string
  logType: string
  title: string
  details: string
  dueDate: string
  status: string
}

export type ReceiptForm = {
  projectId: string
  amount: string
  bankAccount: string
  entryDate: string
  note: string
}

export type ExpenseForm = {
  projectId: string
  amount: string
  category: string
  bankAccount: string
  vendor: string
  entryDate: string
  note: string
}

export type PayoutForm = {
  subprojectId: string
  partnerName: string
  percentage: string
  bankAccount: string
  entryDate: string
  note: string
}

export type SubprojectEntry = {
  discipline: string
  amount: string
  responsiblePartner: string
  deadline: string
}

export type ConvertProjectForm = {
  leadId: string
  clientName: string
  name: string
  area: string
  contractAmount: string
  salesOwner: string
  firstContactAt: string
  proposalSentAt: string
  closedAt: string
  subprojects: SubprojectEntry[]
}
