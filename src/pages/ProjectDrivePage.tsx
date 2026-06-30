import { useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, ExternalLink, FolderOpen, QrCode, RefreshCcw, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BootstrapData, Project, ProjectDriveFile, Subproject } from '@/types/app'
import { EmptyState, Panel } from '@/components/workspace/ui'
import { formatDate } from '@/lib/formatters'
import { LABELS, DISCIPLINE_ALIAS } from '@/lib/constants'

type SubmitMutation = (
  action: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  successMessage?: string,
) => Promise<void>

interface Props {
  data: BootstrapData
  submitMutation: SubmitMutation
  mutating: boolean
  onProjectDriveUpload: (payload: { projectId: string; subprojectId?: string | null; file: File }) => Promise<void>
  onProjectDriveDelete: (fileId: string) => Promise<void>
}

function showDiscipline(value: string | null | undefined): string {
  if (!value) return 'Geral'
  return DISCIPLINE_ALIAS[value] ?? LABELS[value] ?? value
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return '—'
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  if (value >= 1024) return `${Math.round(value / 1024)} KB`
  return `${value} B`
}

function projectListLabel(project: Project) {
  const code = (project.code || '').trim()
  return code ? `${code}. ${project.name}` : project.name
}

function compareProjectsDesc(a: Project, b: Project) {
  const aCode = (a.code || '').trim()
  const bCode = (b.code || '').trim()

  if (aCode || bCode) {
    const codeCompare = bCode.localeCompare(aCode, 'pt-BR', { numeric: true, sensitivity: 'base' })
    if (codeCompare !== 0) return codeCompare
  }

  return b.name.localeCompare(a.name, 'pt-BR', { sensitivity: 'base' })
}

function DriveFileRow({ file, mutating, onDelete }: { file: ProjectDriveFile; mutating: boolean; onDelete: (fileId: string) => Promise<void> }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--ink)]">{file.filename}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
          <span>{formatDate(file.created_at)}</span>
          <span>{formatBytes(file.size_bytes)}</span>
          {file.uploaded_by ? <span>{file.uploaded_by}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/api/app/drive-download?fileId=${encodeURIComponent(file.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Ver
        </a>
        <button
          type="button"
          disabled={mutating}
          onClick={() => void onDelete(file.id)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </div>
  )
}

type DrivePanelProps = {
  selectedProject: Project | null
  publicUrl: string
  qrUrl: string
  generalFiles: ProjectDriveFile[]
  projectFiles: ProjectDriveFile[]
  subprojects: Subproject[]
  mutating: boolean
  triggerUpload: (subprojectId?: string | null) => void
  handleDriveToggle: (enabled: boolean) => void
  handleRotateToken: () => void
  handleCopyLink: () => Promise<void>
  onProjectDriveDelete: (fileId: string) => Promise<void>
}

function DrivePanel({
  selectedProject,
  publicUrl,
  qrUrl,
  generalFiles,
  projectFiles,
  subprojects,
  mutating,
  triggerUpload,
  handleDriveToggle,
  handleRotateToken,
  handleCopyLink,
  onProjectDriveDelete,
}: DrivePanelProps) {
  if (!selectedProject) {
    return <EmptyState title="Nenhum projeto encontrado" body="Crie um projeto primeiro para começar a usar o drive." />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-92)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Projeto selecionado</div>
              <div className="mt-1 text-lg font-semibold text-[var(--ink)]">{projectListLabel(selectedProject)}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">{selectedProject.client_name || 'Cliente não informado'}</div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                checked={selectedProject.drive_enabled}
                disabled={mutating}
                onChange={(event) => handleDriveToggle(event.target.checked)}
              />
              Drive ativo
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={mutating || !selectedProject.drive_enabled}
              onClick={() => triggerUpload(null)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
            >
              <Upload className="h-4 w-4" /> Enviar na pasta geral
            </button>
            <button
              type="button"
              disabled={mutating || !selectedProject.drive_enabled}
              onClick={handleRotateToken}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" /> Regenerar token
            </button>
            <button
              type="button"
              disabled={!publicUrl}
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
            >
              <Copy className="h-4 w-4" /> Copiar link
            </button>
            <a
              href={publicUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] ${publicUrl ? '' : 'pointer-events-none opacity-60'}`}
            >
              <ExternalLink className="h-4 w-4" /> Página pública
            </a>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-card-70)] px-4 py-3 text-xs text-[var(--ink-soft)]">
            {publicUrl || 'Ative o drive para gerar o link público do projeto.'}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-92)] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">
            <QrCode className="h-4 w-4" /> QR do cliente
          </div>
          {qrUrl ? (
            <img src={qrUrl} alt={`QR do drive de ${selectedProject.name}`} className="mt-3 w-full rounded-[18px] border border-[var(--line)] bg-[var(--bg-card-solid)] p-3" />
          ) : (
            <div className="mt-3 rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--bg-card-70)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Ative o drive para gerar o QR.
            </div>
          )}
        </div>
      </div>

      <section className="space-y-4 rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-92)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Pasta geral</div>
            <div className="mt-1 text-sm font-medium text-[var(--ink)]">Arquivos do projeto sem disciplina específica</div>
          </div>
          <button
            type="button"
            disabled={mutating || !selectedProject.drive_enabled}
            onClick={() => triggerUpload(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> Upload geral
          </button>
        </div>
        {generalFiles.length ? generalFiles.map((file) => (
          <DriveFileRow key={file.id} file={file} mutating={mutating} onDelete={onProjectDriveDelete} />
        )) : (
          <EmptyState title="Sem arquivos gerais" body="Envie contratos, briefing, memoriais e outros arquivos compartilhados do projeto." />
        )}
      </section>

      <section className="space-y-4">
        {subprojects.length ? subprojects.map((subproject) => {
          const files = projectFiles.filter((file) => file.subproject_id === subproject.id)
          return (
            <div key={subproject.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-92)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Subprojeto</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{showDiscipline(subproject.discipline)}</div>
                  <div className="mt-1 text-xs text-[var(--ink-soft)]">
                    {subproject.responsible_partner || 'Sem responsável'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={mutating || !selectedProject.drive_enabled}
                  onClick={() => triggerUpload(subproject.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" /> Upload em {showDiscipline(subproject.discipline)}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {files.length ? files.map((file) => (
                  <DriveFileRow key={file.id} file={file} mutating={mutating} onDelete={onProjectDriveDelete} />
                )) : (
                  <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--bg-card-70)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                    Nenhum arquivo enviado para esta disciplina ainda.
                  </div>
                )}
              </div>
            </div>
          )
        }) : (
          <EmptyState title="Sem subprojetos" body="Este projeto ainda não tem disciplinas cadastradas. Você ainda pode usar a pasta geral." />
        )}
      </section>
    </div>
  )
}

export function ProjectDrivePage({ data, submitMutation, mutating, onProjectDriveUpload, onProjectDriveDelete }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadTargetRef = useRef<string | null>(null)

  const sortedProjects = useMemo(
    () => [...data.projects].sort(compareProjectsDesc),
    [data.projects],
  )

  const selectedProjectId = searchParams.get('project') || sortedProjects[0]?.id || ''
  const selectedProject = useMemo(
    () => sortedProjects.find((project) => project.id === selectedProjectId) ?? null,
    [selectedProjectId, sortedProjects],
  )

  const projectFiles = useMemo(
    () => selectedProject ? data.projectDriveFiles.filter((file) => file.project_id === selectedProject.id) : [],
    [data.projectDriveFiles, selectedProject],
  )

  const generalFiles = useMemo(
    () => projectFiles.filter((file) => !file.subproject_id),
    [projectFiles],
  )

  const subprojects = useMemo(
    () => selectedProject ? data.subprojects.filter((item) => item.project_id === selectedProject.id) : [],
    [data.subprojects, selectedProject],
  )

  const publicUrl = selectedProject?.drive_token && typeof window !== 'undefined'
    ? `${window.location.origin}/drive/${selectedProject.drive_token}`
    : ''

  const qrUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicUrl)}`
    : ''

  const openProject = (project: Project) => {
    setSearchParams({ project: project.id }, { replace: true })
  }

  const triggerUpload = (subprojectId?: string | null) => {
    uploadTargetRef.current = subprojectId || null
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file || !selectedProject) return

    await onProjectDriveUpload({
      projectId: selectedProject.id,
      subprojectId: uploadTargetRef.current,
      file,
    })
  }

  const handleDriveToggle = (enabled: boolean) => {
    if (!selectedProject) return
    void submitMutation(
      'setProjectDriveEnabled',
      { projectId: selectedProject.id, enabled },
      undefined,
      enabled ? 'Drive ativado' : 'Drive desativado',
    )
  }

  const handleRotateToken = () => {
    if (!selectedProject) return
    void submitMutation(
      'regenerateProjectDriveToken',
      { projectId: selectedProject.id },
      undefined,
      'Link público atualizado',
    )
  }

  const handleCopyLink = async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    toast.success('Link copiado')
  }

  const drivePanel = (
    <DrivePanel
      selectedProject={selectedProject}
      publicUrl={publicUrl}
      qrUrl={qrUrl}
      generalFiles={generalFiles}
      projectFiles={projectFiles}
      subprojects={subprojects}
      mutating={mutating}
      triggerUpload={triggerUpload}
      handleDriveToggle={handleDriveToggle}
      handleRotateToken={handleRotateToken}
      handleCopyLink={handleCopyLink}
      onProjectDriveDelete={onProjectDriveDelete}
    />
  )

  return (
    <Panel
      title="Drive por projeto"
      subtitle="Central de arquivos por projeto, com separação entre pasta geral e subprojetos."
    >
      <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleFileChange(event)} />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-3">
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--paper)] p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Projetos</div>
            <div className="space-y-2">
              {sortedProjects.map((project) => {
                const active = selectedProject?.id === project.id
                return (
                  <div key={project.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => openProject(project)}
                      className={`block w-full rounded-[18px] border px-3 py-2 text-left transition ${
                        active
                          ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]'
                          : 'border-[var(--line)] bg-[var(--bg-card-solid)] hover:bg-[var(--bg-card-80)]'
                      }`}
                    >
                      <div className="text-sm font-medium text-[var(--ink)]">{projectListLabel(project)}</div>
                    </button>

                    {active ? (
                      <div className="xl:hidden">
                        {drivePanel}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="hidden xl:block">
          {drivePanel}
        </div>
      </div>
    </Panel>
  )
}
