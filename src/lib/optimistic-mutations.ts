import type { BootstrapData } from '@/types/app'

type Payload = Record<string, unknown>

export type OptimisticOperation = {
  action: string
  payload: Payload
}

const has = (payload: Payload, key: string) => Object.prototype.hasOwnProperty.call(payload, key)
const textOrNull = (value: unknown) => {
  const text = String(value ?? '').trim()
  return text || null
}
const numberOr = (value: unknown, fallback: number) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function patchById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>) {
  let changed = false
  const next = items.map((item) => {
    if (item.id !== id) return item
    changed = true
    return { ...item, ...patch }
  })
  return changed ? next : items
}

function patchCashflow(
  data: BootstrapData,
  id: string,
  patch: { amount?: number; entry_date?: string; bank_account?: string | null; note?: string | null; project_id?: string | null },
  sign: 1 | -1,
) {
  const cashflow = patchById(data.cashflow, id, {
    ...patch,
    ...(patch.amount !== undefined ? { signed_amount: sign * patch.amount } : {}),
  })
  return cashflow === data.cashflow ? data : { ...data, cashflow }
}

function syncProjectStage(data: BootstrapData, projectId: string): BootstrapData {
  if (!projectId) return data
  const projectSubprojects = data.subprojects.filter((subproject) => subproject.project_id === projectId)
  if (!projectSubprojects.length) return data

  const stages = projectSubprojects.map((subproject) => subproject.stage)
  const allTodo = stages.every((stage) => stage === 'a-fazer')
  const allDone = stages.every((stage) => stage === 'concluído')
  const nextStage = allDone ? 'concluído' : (allTodo ? 'aguardar' : 'em-andamento')
  const projects = patchById(data.projects, projectId, { stage: nextStage })
  return projects === data.projects ? data : { ...data, projects }
}

export function applyOptimisticMutation(data: BootstrapData, action: string, payload: Payload): BootstrapData {
  const id = String(payload.id ?? payload.projectId ?? payload.leadId ?? payload.subprojectId ?? '')
  if (!id) return data

  switch (action) {
    case 'updateLead':
    case 'updateLeadStage':
    case 'touchLead': {
      const leads = patchById(data.leads, id, {
        ...(has(payload, 'title') ? { title: String(payload.title ?? '') } : {}),
        ...(has(payload, 'stage') ? { stage: String(payload.stage ?? '') } : {}),
        ...(has(payload, 'source') ? { source: textOrNull(payload.source) } : {}),
        ...(has(payload, 'estimatedAmount') ? { estimated_amount: numberOr(payload.estimatedAmount, 0) } : {}),
        ...(has(payload, 'salesOwner') ? { sales_owner: textOrNull(payload.salesOwner) } : {}),
        ...(has(payload, 'notes') ? { notes: textOrNull(payload.notes) } : {}),
        ...(has(payload, 'inboundAt') ? { inbound_at: textOrNull(payload.inboundAt) } : {}),
        ...(has(payload, 'firstContactAt') ? { first_contact_at: textOrNull(payload.firstContactAt) } : {}),
        ...(has(payload, 'lastContactAt') ? { last_contact_at: textOrNull(payload.lastContactAt) } : {}),
        ...(has(payload, 'nextFollowUpAt') ? { next_follow_up_at: textOrNull(payload.nextFollowUpAt) } : {}),
        ...(has(payload, 'proposalSentAt') ? { proposal_sent_at: textOrNull(payload.proposalSentAt) } : {}),
        ...(has(payload, 'closedAt') ? { closed_at: textOrNull(payload.closedAt) } : {}),
      })
      return leads === data.leads ? data : { ...data, leads }
    }

    case 'updateProject': {
      const projects = patchById(data.projects, id, {
        ...(has(payload, 'name') ? { name: String(payload.name ?? '') } : {}),
        ...(has(payload, 'code') ? { code: textOrNull(payload.code) } : {}),
        ...(has(payload, 'area') ? { area: numberOr(payload.area, 0) } : {}),
        ...(has(payload, 'stage') ? { stage: String(payload.stage ?? '') } : {}),
        ...(has(payload, 'contractAmount') ? { contract_amount: numberOr(payload.contractAmount, 0) } : {}),
        ...(has(payload, 'salesOwner') ? { sales_owner: textOrNull(payload.salesOwner) } : {}),
        ...(has(payload, 'clientName') ? { client_name: textOrNull(payload.clientName) } : {}),
        ...(has(payload, 'statusNote') ? { status_note: textOrNull(payload.statusNote) } : {}),
        ...(has(payload, 'notes') ? { notes: textOrNull(payload.notes) } : {}),
      })
      return projects === data.projects ? data : { ...data, projects }
    }

    case 'setProjectArchived': {
      const projects = patchById(data.projects, id, { archived: Boolean(payload.archived) })
      return projects === data.projects ? data : { ...data, projects }
    }

    case 'setProjectDriveEnabled': {
      const projects = patchById(data.projects, id, { drive_enabled: Boolean(payload.enabled) })
      return projects === data.projects ? data : { ...data, projects }
    }

    case 'updateSubproject': {
      const subprojects = patchById(data.subprojects, id, {
        ...(has(payload, 'discipline') ? { discipline: String(payload.discipline ?? '') } : {}),
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'responsiblePartner') ? { responsible_partner: String(payload.responsiblePartner ?? '') } : {}),
        ...(has(payload, 'deadline') ? { deadline: textOrNull(payload.deadline) } : {}),
        ...(has(payload, 'observacao') ? { observacao: textOrNull(payload.observacao) } : {}),
        ...(has(payload, 'area') ? { area: numberOr(payload.area, 0) } : {}),
      })
      return subprojects === data.subprojects ? data : { ...data, subprojects }
    }

    case 'updateSubprojectStage': {
      const subprojects = patchById(data.subprojects, id, {
        stage: String(payload.stage ?? ''),
      })
      if (subprojects === data.subprojects) return data
      const next = { ...data, subprojects }
      const projectId = String(payload.projectId ?? data.subprojects.find((subproject) => subproject.id === id)?.project_id ?? '')
      return syncProjectStage(next, projectId)
    }

    case 'updateProjectStage': {
      const projects = patchById(data.projects, id, { stage: String(payload.stage ?? '') })
      return projects === data.projects ? data : { ...data, projects }
    }

    case 'updateReceipt': {
      const receipts = patchById(data.receipts, id, {
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'bankAccount') ? { bank_account: textOrNull(payload.bankAccount) } : {}),
        ...(has(payload, 'entryDate') ? { received_at: String(payload.entryDate ?? '') } : {}),
        ...(has(payload, 'note') ? { note: textOrNull(payload.note) } : {}),
        ...(has(payload, 'projectId') ? { project_id: textOrNull(payload.projectId) } : {}),
      })
      const next = receipts === data.receipts ? data : { ...data, receipts }
      return patchCashflow(next, id, {
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'bankAccount') ? { bank_account: textOrNull(payload.bankAccount) } : {}),
        ...(has(payload, 'entryDate') ? { entry_date: String(payload.entryDate ?? '') } : {}),
        ...(has(payload, 'note') ? { note: textOrNull(payload.note) } : {}),
        ...(has(payload, 'projectId') ? { project_id: textOrNull(payload.projectId) } : {}),
      }, 1)
    }

    case 'updateExpense': {
      const expenses = patchById(data.expenses, id, {
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'category') ? { category: textOrNull(payload.category) } : {}),
        ...(has(payload, 'vendor') ? { vendor: textOrNull(payload.vendor) } : {}),
        ...(has(payload, 'bankAccount') ? { bank_account: textOrNull(payload.bankAccount) } : {}),
        ...(has(payload, 'entryDate') ? { paid_at: String(payload.entryDate ?? '') } : {}),
        ...(has(payload, 'note') ? { note: textOrNull(payload.note) } : {}),
        ...(has(payload, 'projectId') ? { project_id: textOrNull(payload.projectId) } : {}),
      })
      const next = expenses === data.expenses ? data : { ...data, expenses }
      return patchCashflow(next, id, {
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'bankAccount') ? { bank_account: textOrNull(payload.bankAccount) } : {}),
        ...(has(payload, 'entryDate') ? { entry_date: String(payload.entryDate ?? '') } : {}),
        ...(has(payload, 'note') ? { note: textOrNull(payload.note) } : {}),
        ...(has(payload, 'projectId') ? { project_id: textOrNull(payload.projectId) } : {}),
      }, -1)
    }
    case 'updatePayout': {
      const payouts = patchById(data.payouts, id, {
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'partnerName') ? { partner_name: String(payload.partnerName ?? '') } : {}),
        ...(has(payload, 'bankAccount') ? { bank_account: textOrNull(payload.bankAccount) } : {}),
        ...(has(payload, 'entryDate') ? { paid_at: String(payload.entryDate ?? '') } : {}),
        ...(has(payload, 'note') ? { note: textOrNull(payload.note) } : {}),
      })
      const next = payouts === data.payouts ? data : { ...data, payouts }
      return patchCashflow(next, id, {
        ...(has(payload, 'amount') ? { amount: numberOr(payload.amount, 0) } : {}),
        ...(has(payload, 'bankAccount') ? { bank_account: textOrNull(payload.bankAccount) } : {}),
        ...(has(payload, 'entryDate') ? { entry_date: String(payload.entryDate ?? '') } : {}),
        ...(has(payload, 'note') ? { note: textOrNull(payload.note) } : {}),
      }, -1)
    }

    case 'savePremiseQuestionnaire': {
      const questionnaires = patchById(data.premiseQuestionnaires, id, {
        ...(has(payload, 'respondentName') ? { respondent_name: String(payload.respondentName ?? '') } : {}),
        ...(has(payload, 'contactInfo') ? { contact_info: textOrNull(payload.contactInfo) } : {}),
        ...(has(payload, 'identificationNote') ? { identification_note: textOrNull(payload.identificationNote) } : {}),
        ...(has(payload, 'answers') ? { answers: (payload.answers ?? {}) as Record<string, string> } : {}),
        ...(has(payload, 'status') ? { status: String(payload.status ?? '') } : {}),
      })
      return questionnaires === data.premiseQuestionnaires ? data : { ...data, premiseQuestionnaires: questionnaires }
    }

    case 'deleteLeadProposal': {
      const leads = patchById(data.leads, id, { proposal_filename: null })
      return leads === data.leads ? data : { ...data, leads }
    }

    case 'updateRevision': {
      const revisions = patchById(data.revisions, id, {
        ...(has(payload, 'clientName') ? { client_name: String(payload.clientName ?? '') } : {}),
        ...(has(payload, 'description') ? { description: String(payload.description ?? '') } : {}),
        ...(has(payload, 'projectId') ? { project_id: textOrNull(payload.projectId) } : {}),
        ...(has(payload, 'responsiblePartner') ? { responsible_partner: String(payload.responsiblePartner ?? '') } : {}),
        ...(has(payload, 'deadline') ? { deadline: textOrNull(payload.deadline) } : {}),
        ...(has(payload, 'deliveryDate') ? { delivery_date: textOrNull(payload.deliveryDate) } : {}),
        ...(has(payload, 'stage') ? { stage: String(payload.stage ?? '') } : {}),
      })
      return revisions === data.revisions ? data : { ...data, revisions }
    }

    case 'updateRevisionStage': {
      const revisions = patchById(data.revisions, id, {
        stage: String(payload.stage ?? ''),
        ...(has(payload, 'deliveryDate') ? { delivery_date: textOrNull(payload.deliveryDate) } : {}),
      })
      return revisions === data.revisions ? data : { ...data, revisions }
    }

    default:
      return data
  }
}

export function replayOptimisticMutations(
  confirmed: BootstrapData,
  operations: Iterable<OptimisticOperation>,
): BootstrapData {
  return Array.from(operations).reduce(
    (current, operation) => applyOptimisticMutation(current, operation.action, operation.payload),
    confirmed,
  )
}
