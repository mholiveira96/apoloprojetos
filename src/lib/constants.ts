import {
  BriefcaseBusiness,
  CircleDollarSign,
  FolderKanban,
  Landmark,
  LayoutDashboard,
} from 'lucide-react'

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Painel', href: '/app/dashboard', icon: LayoutDashboard },
  { key: 'comercial', label: 'Comercial', href: '/app/comercial', icon: BriefcaseBusiness },
  { key: 'operacoes', label: 'Operações', href: '/app/operacoes', icon: FolderKanban },
  { key: 'financeiro', label: 'Financeiro', href: '/app/financeiro', icon: CircleDollarSign },
  { key: 'fluxo', label: 'Fluxo de caixa', href: '/app/fluxo', icon: Landmark },
]

export const leadStages = ['incoming', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
export const projectStages = ['aguardar', 'em-andamento', 'bloqueado', 'concluído-aguardando-pagamento', 'concluído'] as const
export const subprojectStages = ['a-fazer', 'em-andamento', 'aguardando-revisao', 'bloqueado', 'concluído-aguardando-pagamento', 'concluído'] as const
export const logTypes = ['pending', 'received_material', 'note', 'delivery', 'revision'] as const
export const partners: string[] = ['Matheus', 'Luís', 'Letícia']
export const leadSources = ['indicacao', 'site', 'instagram', 'linkedin', 'repete', 'parceiro', 'outro'] as const
export const disciplines = ['estrutural', 'arquitetonico', 'eletrico', 'hidraulico', 'incendio', 'legalizacao', 'outro'] as const
export const expenseCategories = [
  'aluguel',
  'endomarketing',
  'plotagem',
  'material',
  'software',
  'serviços',
  'outros',
] as const

export const LABELS: Record<string, string> = {
  dashboard: 'Painel',
  comercial: 'Comercial',
  operacoes: 'Operações',
  financeiro: 'Financeiro',
  fluxo: 'Fluxo de caixa',
  // Lead stages
  incoming: 'Entrada',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Fechado',
  lost: 'Não fechado',
  // Lead sources
  indicacao: 'Indicação',
  site: 'Site',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  repete: 'Cliente recorrente',
  parceiro: 'Parceiro comercial',
  outro: 'Outro',
  // Project stages
  aguardar: 'Aguardando',
  'em-andamento': 'Em andamento',
  bloqueado: 'Bloqueado',
  'concluído-aguardando-pagamento': 'Concluído (aguardando pgto)',
  'concluído': 'Concluído',
  // Subproject stages
  'a-fazer': 'Aguardando',
  'aguardando-revisao': 'Aguardando revisão',
  // Disciplines
  estrutural: 'Estrutural',
  arquitetonico: 'Arquitetônico',
  eletrico: 'Elétrico',
  hidraulico: 'Hidráulico',
  incendio: 'Combate a incêndio',
  legalizacao: 'Legalização',
  // Log types
  pending: 'Pendência',
  received_material: 'Material recebido',
  note: 'Nota',
  delivery: 'Entrega',
  revision: 'Revisão',
  // Financial types
  receipt: 'Recebimento',
  expense: 'Despesa',
  payout: 'Repasse',
  open: 'Aberto',
  done: 'Concluído',
  // Expense categories
  aluguel: 'Aluguel',
  endomarketing: 'Endomarketing',
  plotagem: 'Plotagem',
  material: 'Material',
  software: 'Software',
  'serviços': 'Serviços',
  outros: 'Outros',
}
