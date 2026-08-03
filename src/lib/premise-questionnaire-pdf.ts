import jsPDF from 'jspdf'
import type { PremiseQuestionnaire } from '@/types/app'
import { canonicalQuestionnaireAnswer, emptyAnswers, questions } from '@/lib/premise-questionnaire'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const TEAL = [0, 157, 149] as const
const INK = [28, 35, 36] as const
const MUTED = [102, 112, 113] as const
const PALE_TEAL = [235, 248, 246] as const
const LINE = [218, 228, 226] as const

type PdfRecord = PremiseQuestionnaire

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function questionnaireAnswers(record: PdfRecord) {
  const answers = { ...emptyAnswers(), ...record.answers }
  return Object.fromEntries(
    questions.map((question) => [question.id, canonicalQuestionnaireAnswer(question, answers[question.id] || '')]),
  ) as Record<string, string>
}

async function loadImageDataUrl(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Não foi possível carregar a logo (${response.status})`)
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a logo'))
    reader.readAsDataURL(blob)
  })
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('Apolo Projetos Inteligentes · Questionário de premissas', MARGIN, PAGE_HEIGHT - 9)
  doc.text(`${pageNumber} / ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 9, { align: 'right' })
}

export async function exportPremiseQuestionnairesPdf(records: PdfRecord[]) {
  if (records.length === 0) throw new Error('Não há questionários para exportar')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo = await loadImageDataUrl('/logo-apolo-pdf.png')
  let y = 18

  doc.addImage(logo, 'PNG', MARGIN, 12, 35, 17.1)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...TEAL)
  doc.text('APOLO / PREMISSAS', 60, 17)
  doc.setFontSize(21)
  doc.setTextColor(...INK)
  doc.text('Questionários de premissas', 60, 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(`${records.length} ${records.length === 1 ? 'residência registrada' : 'residências registradas'} · exportado em ${formatDate(new Date().toISOString())}`, 60, 33)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(1.1)
  doc.line(MARGIN, 40, PAGE_WIDTH - MARGIN, 40)
  y = 51

  const ensureSpace = (height: number) => {
    if (y + height <= PAGE_HEIGHT - 22) return
    doc.addPage()
    y = 20
  }

  records.forEach((record, recordIndex) => {
    const answers = questionnaireAnswers(record)
    ensureSpace(32)

    doc.setFillColor(...TEAL)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 4, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text(`RESIDÊNCIA ${String(recordIndex + 1).padStart(2, '0')}`, MARGIN + 7, y + 7)
    doc.setFontSize(13)
    doc.text(answers.respondentName || record.respondent_name || 'Sem nome informado', MARGIN + 7, y + 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(answers.contactInfo || record.contact_info || 'Sem contato informado', PAGE_WIDTH - MARGIN - 7, y + 8, { align: 'right' })
    doc.text(`Atualizado em ${formatDate(record.updated_at)}`, PAGE_WIDTH - MARGIN - 7, y + 15, { align: 'right' })
    y += 29

    questions.slice(2).forEach((question) => {
      const labelLines = doc.splitTextToSize(question.label, CONTENT_WIDTH - 14) as string[]
      const answerLines = doc.splitTextToSize(answers[question.id] || 'Não informado', CONTENT_WIDTH - 14) as string[]
      const blockHeight = 8 + labelLines.length * 3.4 + answerLines.length * 4.4
      ensureSpace(blockHeight + 4)

      doc.setFillColor(...PALE_TEAL)
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, blockHeight, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.3)
      doc.setTextColor(...MUTED)
      doc.text(labelLines, MARGIN + 7, y + 6, { lineHeightFactor: 1.15 })
      const answerY = y + 6 + labelLines.length * 3.4 + 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.2)
      doc.setTextColor(...INK)
      doc.text(answerLines, MARGIN + 7, answerY, { lineHeightFactor: 1.2 })
      y += blockHeight + 4
    })

    if (recordIndex < records.length - 1) {
      ensureSpace(16)
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.35)
      doc.line(MARGIN + 18, y + 2, PAGE_WIDTH - MARGIN - 18, y + 2)
      y += 13
    }
  })

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    addFooter(doc, page, totalPages)
  }

  const date = new Date().toISOString().slice(0, 10)
  doc.save(`questionarios-premissas-${date}.pdf`)
}
