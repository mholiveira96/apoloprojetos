import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, FileText } from 'lucide-react'
import type { ProjectDriveFile } from '@/types/app'
import { EmptyState, Panel } from '@/components/workspace/ui'
import { formatDate } from '@/lib/formatters'
import { DISCIPLINE_ALIAS, LABELS } from '@/lib/constants'

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
  const { token = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PublicProjectDrivePayload | null>(null)
  const [error, setError] = useState('')

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

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-8 text-[var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Panel
          title={data ? `Drive do projeto · ${data.project.name}` : 'Drive do projeto'}
          subtitle={data?.project.client_name || 'Arquivos compartilhados pela Apolo para acompanhamento do projeto.'}
        >
          {loading ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white px-5 py-8 text-sm text-[var(--ink-soft)]">
              Carregando arquivos...
            </div>
          ) : error ? (
            <EmptyState title="Não foi possível abrir este drive" body={error} />
          ) : !data || groupedFiles.length === 0 ? (
            <EmptyState title="Nenhum arquivo liberado" body="Quando a equipe enviar arquivos para este projeto, eles vão aparecer aqui." />
          ) : (
            <div className="space-y-4">
              {groupedFiles.map((group) => (
                <section key={group.key} className="rounded-[24px] border border-[var(--line)] bg-white/85 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">
                    <FileText className="h-4 w-4" /> {group.label}
                  </div>
                  <div className="mt-4 space-y-3">
                    {group.files.map((file) => (
                      <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-white px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[var(--ink)]">{file.filename}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
                            <span>{formatDate(file.created_at)}</span>
                            <span>{formatBytes(file.size_bytes)}</span>
                          </div>
                        </div>
                        <a
                          href={file.blob_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
                        >
                          <Download className="h-3.5 w-3.5" /> Abrir arquivo
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </main>
  )
}
