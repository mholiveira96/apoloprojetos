type CalendarSubproject = {
  stage: string
  deadline: string | null
}

type CalendarProject = {
  stage: string
}

const COMPLETED_STAGES = new Set(['concluído', 'concluído-aguardando-pagamento'])

export function isCalendarSubprojectVisible(subproject: CalendarSubproject, project: CalendarProject): boolean {
  return !COMPLETED_STAGES.has(subproject.stage) && !COMPLETED_STAGES.has(project.stage)
}
