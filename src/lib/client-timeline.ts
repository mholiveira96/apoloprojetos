import type { BootstrapData, ClientTimelineItem, Lead, Project } from '@/types/app'
import { formatCurrency, numericValue, stageLabel } from './formatters'

function normalizeName(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function addTimelineItem(items: ClientTimelineItem[], item: ClientTimelineItem | null) {
  if (!item?.date) return
  items.push(item)
}

function leadTimelineItems(lead: Lead): ClientTimelineItem[] {
  const items: ClientTimelineItem[] = []
  addTimelineItem(items, {
    id: `${lead.id}-lead-inbound`,
    date: lead.inbound_at || lead.created_at,
    kind: 'lead',
    title: 'Lead entrou no funil',
    detail: lead.title,
  })
  addTimelineItem(items, lead.first_contact_at ? {
    id: `${lead.id}-lead-first-contact`,
    date: lead.first_contact_at,
    kind: 'lead',
    title: 'Primeiro contato',
    detail: lead.title,
  } : null)
  addTimelineItem(items, lead.proposal_sent_at ? {
    id: `${lead.id}-lead-proposal`,
    date: lead.proposal_sent_at,
    kind: 'lead',
    title: 'Proposta enviada',
    detail: lead.title,
  } : null)
  addTimelineItem(items, lead.last_contact_at ? {
    id: `${lead.id}-lead-last-contact`,
    date: lead.last_contact_at,
    kind: 'lead',
    title: 'Último contato',
    detail: lead.title,
  } : null)
  addTimelineItem(items, lead.next_follow_up_at ? {
    id: `${lead.id}-lead-follow-up`,
    date: lead.next_follow_up_at,
    kind: 'deadline',
    title: 'Próxima ação agendada',
    detail: lead.title,
  } : null)
  addTimelineItem(items, lead.closed_at ? {
    id: `${lead.id}-lead-closed`,
    date: lead.closed_at,
    kind: 'lead',
    title: lead.stage === 'won' ? 'Lead fechado' : 'Lead encerrado',
    detail: lead.title,
  } : null)
  return items
}

function projectTimelineItems(project: Project): ClientTimelineItem[] {
  const items: ClientTimelineItem[] = []
  addTimelineItem(items, {
    id: `${project.id}-project-created`,
    date: project.created_at,
    kind: 'project',
    title: 'Projeto criado',
    detail: project.name,
  })
  addTimelineItem(items, project.sale_recorded_at ? {
    id: `${project.id}-project-sale`,
    date: project.sale_recorded_at,
    kind: 'project',
    title: 'Contratação registrada',
    detail: `${project.name} · ${formatCurrency(numericValue(project.contract_amount))}`,
  } : null)
  return items
}

export function buildClientTimeline(
  data: BootstrapData,
  clientName: string | null | undefined,
  options: { leadId?: string | null; projectId?: string | null } = {},
) {
  const targetClient = normalizeName(clientName)
  const items: ClientTimelineItem[] = []
  const projectsById = new Map(data.projects.map((project) => [project.id, project]))
  const relevantProjects = data.projects.filter((project) => (
    project.id === options.projectId
    || (!!targetClient && normalizeName(project.client_name) === targetClient)
  ))
  const relevantProjectIds = new Set(relevantProjects.map((project) => project.id))
  const relevantLeads = data.leads.filter((lead) => (
    lead.id === options.leadId
    || (!!targetClient && normalizeName(lead.client_name) === targetClient)
  ))

  relevantLeads.forEach((lead) => {
    items.push(...leadTimelineItems(lead))
  })

  relevantProjects.forEach((project) => {
    items.push(...projectTimelineItems(project))
  })

  data.logs
    .filter((log) => relevantProjectIds.has(log.project_id))
    .forEach((log) => {
      const project = projectsById.get(log.project_id)
      addTimelineItem(items, {
        id: log.id,
        date: log.due_date || log.created_at,
        kind: 'log',
        title: stageLabel(log.log_type),
        detail: `${project?.name || log.project_name}${log.title ? ` · ${log.title}` : ''}`,
      })
    })

  data.receipts
    .filter((receipt) => (
      (!!targetClient && normalizeName(receipt.client_name) === targetClient)
      || (!!receipt.project_id && relevantProjectIds.has(receipt.project_id))
    ))
    .forEach((receipt) => {
      addTimelineItem(items, {
        id: receipt.id,
        date: receipt.received_at,
        kind: 'receipt',
        title: 'Recebimento',
        detail: `${formatCurrency(numericValue(receipt.amount))}${receipt.project_name ? ` · ${receipt.project_name}` : ''}`,
      })
    })

  data.expenses
    .filter((expense) => !!expense.project_id && relevantProjectIds.has(expense.project_id))
    .forEach((expense) => {
      addTimelineItem(items, {
        id: expense.id,
        date: expense.paid_at,
        kind: 'expense',
        title: 'Despesa',
        detail: `${formatCurrency(numericValue(expense.amount))}${expense.vendor ? ` · ${expense.vendor}` : ''}`,
      })
    })

  data.payouts
    .filter((payout) => relevantProjectIds.has(payout.project_id))
    .forEach((payout) => {
      addTimelineItem(items, {
        id: payout.id,
        date: payout.paid_at,
        kind: 'payout',
        title: 'Repasse',
        detail: `${formatCurrency(numericValue(payout.amount))} · ${payout.partner_name}`,
      })
    })

  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
}
