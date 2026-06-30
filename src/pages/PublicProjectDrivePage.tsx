import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink, FileText, FolderOpen, Sparkles } from 'lucide-react'
import type { ProjectDriveFile } from '@/types/app'
import { EmptyState } from '@/components/workspace/ui'
import { formatDate } from '@/lib/formatters'
import { DISCIPLINE_ALIAS, LABELS } from '@/lib/constants'
import { isPdfProjectDriveFile, parseProjectDriveToken } from '@/lib/project-drive'
import { useTheme } from '@/lib/theme-context'

type PublicProjectDrivePayload = {
  project: {
    id: string
    name: string
    client_name: string | null
    drive_updated_at: string | null
  }
  files: ProjectDriveFile[]
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

export function PublicProjectDrivePage() {
  const { token: rawToken = '' } = useParams()
  const token = parseProjectDriveToken(rawToken)
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PublicProjectDrivePayload | null>(null)
  const [error, setError] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/public/project-drive?token=${encodeURIComponent(token)}`)
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(body.error || 'Falha ao carregar drive público')
        }
        setData(body)
      } catch (err) {
        setData(null)
        setError(err instanceof Error ? err.message : 'Falha ao carregar drive público')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      void load()
    } else {
      setLoading(false)
      setError('Link inválido')
    }
  }, [token])

  useEffect(() => {
    if (!data?.files.length) {
      setSelectedFileId('')
      return
    }

    const hasCurrent = data.files.some((file) => file.id === selectedFileId)
    if (hasCurrent) return

    const preferredFile = data.files.find((file) => isPdfProjectDriveFile(file)) ?? data.files[0]
    setSelectedFileId(preferredFile.id)
  }, [data, selectedFileId])

  const groupedFiles = useMemo(() => {
    if (!data) return [] as Array<{ key: string; label: string; files: ProjectDriveFile[] }>
    const groups = new Map<string, { key: string; label: string; files: ProjectDriveFile[] }>()
    for (const file of data.files) {
      const key = file.subproject_id || 'general'
      const label = showDiscipline(file.subproject_discipline)
      const existing = groups.get(key)
      if (existing) {
        existing.files.push(file)
      } else {
        groups.set(key, { key, label, files: [file] })
      }
    }

    const values = Array.from(groups.values())
    values.sort((a, b) => {
      if (a.key === 'general') return -1
      if (b.key === 'general') return 1
      return a.label.localeCompare(b.label)
    })
    return values
  }, [data])

  const selectedFile = useMemo(
    () => data?.files.find((file) => file.id === selectedFileId) ?? null,
    [data, selectedFileId],
  )

  const pdfCount = useMemo(
    () => data?.files.filter((file) => isPdfProjectDriveFile(file)).length ?? 0,
    [data],
  )

  const logoSrc = theme === 'dark' ? '/logo-apolo-darkmode.png' : '/logo-apolo.png'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_32%),linear-gradient(180deg,var(--paper)_0%,var(--sand)_100%)] px-4 py-6 text-[var(--ink)] sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--bg-card-92)] p-5 shadow-[var(--motion-shadow-hover)] sm:p-7 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.12),_transparent_24%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3">
                  <img src={logoSrc} alt="Apolo Projetos" className="h-8 w-auto object-contain sm:h-10" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--teal-active-border)] bg-[var(--teal-wash)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
                  <Sparkles className="h-3.5 w-3.5" /> Área compartilhada
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]/80">Central de arquivos do projeto</div>
                <h1 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
                  {data?.project.name || 'Drive do projeto'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)] sm:text-base">
                  {data?.project.client_name
                    ? `Arquivos enviados pela Apolo para ${data.project.client_name}. Consulte materiais, visualize PDFs e faça download dos documentos do projeto.`
                    : 'Arquivos enviados pela Apolo para acompanhamento do projeto. Consulte materiais, visualize PDFs e faça download dos documentos.'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Arquivos</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{data?.files.length ?? 0}</div>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">PDFs</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{pdfCount}</div>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Atualizado</div>
                <div className="mt-2 text-sm font-semibold text-[var(--ink)]">
                  {data?.project.drive_updated_at ? formatDate(data.project.drive_updated_at) : 'Agora há pouco'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-5 py-8 text-sm text-[var(--ink-soft)]">
            Carregando arquivos...
          </div>
        ) : error ? (
          <EmptyState title="Não foi possível abrir este drive" body={error} />
        ) : !data || groupedFiles.length === 0 ? (
          <EmptyState title="Nenhum arquivo liberado" body="Quando a equipe enviar arquivos para este projeto, eles vão aparecer aqui." />
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-[var(--line)] bg-[var(--bg-card-92)] shadow-[var(--motion-shadow-hover)]">
            <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="border-b border-[var(--line)] bg-[var(--bg-card-85)] xl:border-b-0 xl:border-r">
                <div className="border-b border-[var(--line)] px-5 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Arquivos do projeto</div>
                  <div className="mt-1 text-sm text-[var(--ink-soft)]">Selecione um arquivo para visualizar com mais espaço.</div>
                </div>

                <div className="space-y-4 p-4 xl:max-h-[calc(100vh-16rem)] xl:overflow-y-auto">
                  {groupedFiles.map((group, groupIndex) => (
                    <section key={group.key} className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]/80">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${groupIndex % 3 === 0 ? 'bg-[var(--teal)]' : groupIndex % 3 === 1 ? 'bg-[var(--indigo-text)]' : 'bg-[var(--amber-text)]'}`}
                        />
                        {group.label}
                      </div>

                      <div className="space-y-2">
                        {group.files.map((file) => {
                          const isSelected = file.id === selectedFileId
                          const isPdf = isPdfProjectDriveFile(file)
                          return (
                            <article
                              key={file.id}
                              className={`rounded-[22px] border px-3.5 py-3 transition ${isSelected
                                ? 'border-[var(--teal-active-border)] bg-[var(--teal-wash)]'
                                : 'border-[var(--line)] bg-[var(--bg-card-solid)] hover:border-[var(--teal-active-border)] hover:bg-[var(--bg-card-solid)]'}`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedFileId(file.id)}
                                className="w-full text-left"
                              >
                                <div className="flex items-start gap-2">
                                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--teal)]" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-[var(--ink)]">{file.filename}</div>
                                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[var(--ink-soft)]">
                                      <span>{formatDate(file.created_at)}</span>
                                      <span>{formatBytes(file.size_bytes)}</span>
                                      <span>{isPdf ? 'PDF' : 'Arquivo'}</span>
                                    </div>
                                  </div>
                                </div>
                              </button>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFileId(file.id)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-card-solid)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink)] transition hover:border-[var(--teal-active-border)] hover:text-[var(--teal)]"
                                >
                                  <FolderOpen className="h-3.5 w-3.5" /> {isPdf ? 'Ver' : 'Sel.'}
                                </button>
                                <a
                                  href={file.blob_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink)] transition hover:border-[var(--teal-active-border)] hover:text-[var(--teal)]"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                                </a>
                                <a
                                  href={`/api/public/project-drive-download?fileId=${encodeURIComponent(file.id)}&token=${encodeURIComponent(token)}`}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                                >
                                  <Download className="h-3.5 w-3.5" /> Baixar
                                </a>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </aside>

              <div className="p-4 sm:p-5 lg:p-6">
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Prévia do arquivo</div>
                        <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">{selectedFile.filename}</h2>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
                          <span>{selectedFile.project_name}</span>
                          <span>{selectedFile.subproject_discipline ? showDiscipline(selectedFile.subproject_discipline) : 'Geral'}</span>
                          <span>{formatBytes(selectedFile.size_bytes)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={selectedFile.blob_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--teal-active-border)] hover:text-[var(--teal)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
                        </a>
                        <a
                          href={`/api/public/project-drive-download?fileId=${encodeURIComponent(selectedFile.id)}&token=${encodeURIComponent(token)}`}
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          <Download className="h-3.5 w-3.5" /> Baixar arquivo
                        </a>
                      </div>
                    </div>

                    {isPdfProjectDriveFile(selectedFile) ? (
                      <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-solid)]">
                        <iframe
                          title={`Prévia de ${selectedFile.filename}`}
                          src={selectedFile.blob_url}
                          className="h-[78vh] min-h-[620px] w-full bg-white"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--bg-card-solid)] px-6 py-10 text-center">
                        <FileText className="h-10 w-10 text-[var(--teal)]" />
                        <h3 className="mt-4 text-lg font-semibold text-[var(--ink)]">Prévia indisponível para este formato</h3>
                        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink-soft)]">
                          Este arquivo não possui visualização incorporada nesta página. Use os botões acima para abrir em nova aba ou baixar o arquivo.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--bg-card-solid)] px-6 py-10 text-center text-sm text-[var(--ink-soft)]">
                    Selecione um arquivo para visualizar.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
