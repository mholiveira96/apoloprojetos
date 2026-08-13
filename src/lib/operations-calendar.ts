type CalendarSubproject = {
  stage: string
  deadline: string | null
}

type CalendarProject = {
  stage: string
}

const COMPLETED_STAGES = new Set(['concluído', 'concluído-aguardando-pagamento'])
const FOLLOW_UP_STAGES = new Set(['aguardando-revisao', 'bloqueado'])

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const key = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null
}

export function isCalendarSubprojectVisible(subproject: CalendarSubproject, project: CalendarProject): boolean {
  return !COMPLETED_STAGES.has(subproject.stage) && !COMPLETED_STAGES.has(project.stage)
}

export function isCalendarSubprojectFollowUp(subproject: CalendarSubproject, project: CalendarProject): boolean {
  return isCalendarSubprojectVisible(subproject, project) && FOLLOW_UP_STAGES.has(subproject.stage)
}

export function isCalendarSubprojectOverdue(
  subproject: CalendarSubproject,
  project: CalendarProject,
  today: string,
): boolean {
  const deadline = dateKey(subproject.deadline)
  return Boolean(
    isCalendarSubprojectVisible(subproject, project)
      && !isCalendarSubprojectFollowUp(subproject, project)
      && deadline
      && deadline < today,
  )
}

export function isCalendarDeadlineVisible(
  subproject: CalendarSubproject,
  project: CalendarProject,
  today: string,
): boolean {
  const deadline = dateKey(subproject.deadline)
  return Boolean(
    isCalendarSubprojectVisible(subproject, project)
      && !isCalendarSubprojectFollowUp(subproject, project)
      && deadline
      && deadline >= today,
  )
}
