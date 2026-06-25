import {
  BriefcaseBusiness,
  CircleDollarSign,
  FolderKanban,
  HardDrive,
  Landmark,
  LayoutDashboard,
  Table2,
} from 'lucide-react'

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Painel', href: '/app/dashboard', icon: LayoutDashboard },
  { key: 'comercial', label: 'Comercial', href: '/app/comercial', icon: BriefcaseBusiness },
  { key: 'operacoes', label: 'Operações', href: '/app/operacoes', icon: FolderKanban },
  { key: 'drive', label: 'Drive', href: '/app/drive', icon: HardDrive },
  { key: 'financeiro', label: 'Financeiro', href: '/app/financeiro', icon: CircleDollarSign },
  { key: 'fluxo', label: 'Fluxo de caixa', href: '/app/fluxo', icon: Landmark },
]

export const BOTTOM_NAV_ITEMS = [
  { key: 'database', label: 'Database', href: '/app/database', icon: Table2 },
]

export const leadStages = ['incoming', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
export const projectStages = ['aguardar', 'em-andamento', 'bloqueado', 'concluído-aguardando-pagamento', 'concluído'] as const
export const subprojectStages = ['a-fazer', 'em-andamento', 'aguardando-revisao', 'bloqueado', 'concluído-aguardando-pagamento', 'concluído'] as const
export const revisionStages = ['pendente', 'em-andamento', 'bloqueado', 'concluída'] as const
export const logTypes = ['pending', 'received_material', 'note', 'delivery', 'revision'] as const
export const partners: string[] = ['Matheus', 'Luís', 'Letícia']
export const leadSources = ['indicacao', 'site', 'instagram', 'linkedin', 'repete', 'parceiro', 'outro'] as const
export const disciplines = ['estrutural', 'arquitetonico', 'eletrico', 'hidrossanitario', 'hidraulico', 'sanitario', 'pluvial', 'incendio', 'climatizacao', 'legalizacao', 'outro'] as const

export const DISCIPLINE_ALIAS: Record<string, string> = {
  estrutural: 'Estrutural',
  arquitetonico: 'Arquitetônico',
  eletrico: 'Elétrico',
  hidrossanitario: 'Hidrossanitário',
  hidraulico: 'Hidráulica',
  sanitario: 'Sanitário',
  pluvial: 'Pluvial',
  incendio: 'Incêndio',
  climatizacao: 'Climatização',
  legalizacao: 'Legalização',
  outro: 'Outro',
}
export const expenseCategories = [
  'aluguel',
  'endomarketing',
  'ferias',
  'plotagem',
  'material',
  'software',
  'serviços',
  'impostos',
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
  'aguardando-revisao': 'Acompanhamento',
  // Revision stages
  pendente: 'Pendente',
  concluída: 'Concluída',
  // Disciplines
  estrutural: 'Estrutural',
  arquitetonico: 'Arquitetônico',
  eletrico: 'Elétrico',
  hidrossanitario: 'Hidrossanitário',
  hidraulico: 'Hidráulica',
  sanitario: 'Sanitário',
  pluvial: 'Pluvial',
  incendio: 'Combate a incêndio',
  climatizacao: 'Climatização',
  legalizacao: 'Legalização',
  // Log types
  pending: 'Pendência',
  received_material: 'Material recebido',
  note: 'Nota',
  delivery: 'Entrega',
  revision: 'Revisão',
  // Financial types
  lead: 'Lead',
  project: 'Projeto',
  log: 'Log',
  deadline: 'Prazo',
  receipt: 'Recebimento',
  expense: 'Despesa',
  payout: 'Repasse',
  open: 'Aberto',
  done: 'Concluído',
  // Expense categories
  aluguel: 'Aluguel',
  endomarketing: 'Endomarketing',
  ferias: 'F\u00e9rias',
  plotagem: 'Plotagem',
  material: 'Material',
  software: 'Software',
  'serviços': 'Serviços',
  impostos: 'Impostos e Taxas',
  outros: 'Outros',
}
