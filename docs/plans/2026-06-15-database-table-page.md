# Database Table Page — Implementation Plan

> **Goal:** Create a new "Database" page in the Apolo app that displays projects and subprojects in an Excel-like nested table with inline editing, column sorting, search filtering, and confirmation modals.

**Architecture:** A new `DatabasePage.tsx` component renders a sortable, filterable table. Projects are top-level rows with ▶/▼ expand toggle. Subprojects nest underneath with indentation. Clicking a cell turns it into an inline input (text or dropdown). On blur/Enter, a confirmation modal appears. Confirming triggers the existing `updateProject` or `updateSubproject` mutation. Errors revert the cell and show a toast.

**Tech Stack:** React, Tailwind CSS, lucide-react icons, sonner toasts, existing `submitMutation` pattern.

---

## Task 1: Add "Database" to NAV_ITEMS

**Objective:** Register the new nav entry so it appears in the sidebar.

**Files:**
- Modify: `src/lib/constants.ts` (add NAV_ITEMS entry)

**Steps:**

1. Add import for `Database` icon from lucide-react in constants.ts (or use a generic icon like `Table2`)

2. Add entry to `NAV_ITEMS` array after `fluxo`:
```ts
{ key: 'database', label: 'Database', href: '/app/database', icon: Table2 },
```

3. Verify: `npm run build` passes

4. Commit: `feat(db-table): add Database nav item`

---

## Task 2: Create DatabasePage skeleton

**Objective:** Create the page component with props matching the existing pattern, wired into ApoloWorkspace.

**Files:**
- Create: `src/pages/DatabasePage.tsx`
- Modify: `src/pages/ApoloWorkspace.tsx` (import + render)

**Steps:**

1. Create `src/pages/DatabasePage.tsx`:
```tsx
import type { BootstrapData, Project, Subproject } from '@/types/app'

type Props = {
  data: BootstrapData
  submitMutation: (action: string, payload: Record<string, unknown>, onSuccess?: () => void, successMsg?: string) => Promise<boolean>
  mutating: boolean
}

export default function DatabasePage({ data, submitMutation, mutating }: Props) {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-[var(--ink)]">Database</h1>
      <p className="text-sm text-[var(--ink-soft)]">Projetos e subprojetos</p>
    </div>
  )
}
```

2. In `ApoloWorkspace.tsx`, add import at top:
```tsx
import DatabasePage from './DatabasePage'
```

3. In the render section (after the `fluxo` block around line 1071), add:
```tsx
{section === 'database' ? (
  <DatabasePage data={data} submitMutation={submitMutation} mutating={mutating} />
) : null}
```

4. Verify: `npm run build` passes, navigate to `/app/database` shows the skeleton

5. Commit: `feat(db-table): create DatabasePage skeleton`

---

## Task 3: Build the nested table with project rows

**Objective:** Render projects as table rows with columns: expand toggle, name, code, stage, contract_amount, sales_owner, client_name (read-only).

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Define column config:
```tsx
const PROJECT_COLUMNS = [
  { key: '_toggle', label: '', width: 'w-8' },
  { key: 'name', label: 'Nome', editable: true },
  { key: 'code', label: 'Código', editable: true },
  { key: 'stage', label: 'Estágio', editable: true, type: 'select' },
  { key: 'contract_amount', label: 'Contrato', editable: true, type: 'currency' },
  { key: 'sales_owner', label: 'Responsável', editable: true, type: 'select' },
  { key: 'client_name', label: 'Cliente', editable: false },
]
```

2. Render a `<table>` with sticky header, full width, using CSS vars:
```tsx
<table className="w-full text-sm border-collapse">
  <thead>
    <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
      {PROJECT_COLUMNS.map(col => (
        <th key={col.key} className={`${col.width || ''} px-3 py-2 text-left text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider`}>
          {col.label}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {sortedProjects.map(project => (
      <tr key={project.id} className="border-b border-[var(--line)] hover:bg-[var(--teal-active-bg)]">
        <td className="px-3 py-2">
          <button onClick={() => toggleExpand(project.id)} className="text-[var(--ink-soft)]">
            {expanded.has(project.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-3 py-2 font-medium text-[var(--ink)]">{project.name}</td>
        <td className="px-3 py-2 text-[var(--ink-soft)]">{project.code || '—'}</td>
        <td className="px-3 py-2"><StageBadge stage={project.stage} /></td>
        <td className="px-3 py-2 text-right">{formatCurrency(project.contract_amount)}</td>
        <td className="px-3 py-2">{project.sales_owner || '—'}</td>
        <td className="px-3 py-2 text-[var(--ink-soft)]">{project.client_name || '—'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

3. Add expand state: `const [expanded, setExpanded] = useState<Set<string>>(new Set())`

4. Add toggle function:
```tsx
const toggleExpand = (id: string) => {
  setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

5. Import `ChevronRight`, `ChevronDown` from lucide-react, `formatCurrency` from `@/lib/formatters`

6. Verify: `npm run build` passes, table renders with project rows

7. Commit: `feat(db-table): render project rows in table`

---

## Task 4: Add subproject rows (nested)

**Objective:** When a project row is expanded, show its subprojects indented below.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Define subproject columns:
```tsx
const SUBPROJECT_COLUMNS = [
  { key: '_indent', label: '', width: 'w-8' },
  { key: 'discipline', label: 'Disciplina', editable: true, type: 'select' },
  { key: 'amount', label: 'Valor', editable: true, type: 'currency' },
  { key: 'stage', label: 'Estágio', editable: true, type: 'select' },
  { key: 'responsible_partner', label: 'Parceiro', editable: true, type: 'select' },
  { key: 'deadline', label: 'Prazo', editable: true, type: 'date' },
  { key: '_spacer', label: '', width: '' },
]
```

2. After each project row, if expanded, render subproject rows:
```tsx
{expanded.has(project.id) && data.subprojects
  .filter(sp => sp.project_id === project.id)
  .map(sp => (
    <tr key={sp.id} className="border-b border-[var(--line)] bg-[var(--paper)]">
      <td className="px-3 py-2 pl-10">
        <span className="inline-block w-4" />
      </td>
      <td className="px-3 py-2 pl-10">{DISCIPLINE_ALIAS[sp.discipline] || sp.discipline}</td>
      <td className="px-3 py-2 text-right">{formatCurrency(sp.amount)}</td>
      <td className="px-3 py-2"><StageBadge stage={sp.stage} /></td>
      <td className="px-3 py-2">{sp.responsible_partner}</td>
      <td className="px-3 py-2">{sp.deadline ? formatDate(sp.deadline) : '—'}</td>
      <td className="px-3 py-2" />
    </tr>
  ))
}
```

3. Import `DISCIPLINE_ALIAS` from `@/lib/constants`, `formatDate` from `@/lib/formatters`

4. Verify: `npm run build` passes, expand/collapse shows/hides subproject rows

5. Commit: `feat(db-table): add nested subproject rows`

---

## Task 5: Inline editing — text inputs

**Objective:** Clicking an editable text cell (name, code) replaces the cell content with an input field.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Add editing state:
```tsx
const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
const [editValue, setEditValue] = useState('')
```

2. Create `EditableCell` component:
```tsx
function EditableCell({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
  format,
}: {
  value: string
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
  format?: (v: string) => string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCommit() }}
        className="w-full bg-white border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      />
    )
  }

  return (
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {format ? format(value) : (value || '—')}
    </span>
  )
}
```

3. Wire into project rows for `name` and `code` fields:
```tsx
<EditableCell
  value={project.name}
  isEditing={editing?.id === project.id && editing?.field === 'name'}
  onStart={() => { setEditing({ id: project.id, field: 'name' }); setEditValue(project.name || '') }}
  onChange={setEditValue}
  onCommit={() => handleCommit(project, 'name')}
/>
```

4. Add `handleCommit` function (Task 7 will add the modal — for now, just save directly):
```tsx
const handleCommit = async (entity: Project | Subproject, field: string) => {
  setEditing(null)
  // Placeholder — modal will be added in Task 7
}
```

5. Verify: `npm run build` passes, clicking name/code cell shows input

6. Commit: `feat(db-table): add inline text editing`

---

## Task 6: Inline editing — dropdowns

**Objective:** Clicking an editable select cell (stage, discipline, sales_owner, responsible_partner) shows a dropdown.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Define option maps:
```tsx
import { projectStages, subprojectStages, disciplines, partners, LABELS } from '@/lib/constants'

const SELECT_OPTIONS: Record<string, string[]> = {
  stage: [...projectStages],       // context-dependent, handled below
  discipline: [...disciplines],
  sales_owner: [...partners],
  responsible_partner: [...partners],
}
```

2. Create `EditableSelect` component:
```tsx
function EditableSelect({
  value,
  options,
  isEditing,
  onStart,
  onChange,
  onCommit,
}: {
  value: string
  options: string[]
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
}) {
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        value={value}
        onChange={e => { onChange(e.target.value); onCommit() }}
        onBlur={onCommit}
        className="w-full bg-white border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{LABELS[opt] || opt}</option>
        ))}
      </select>
    )
  }

  return (
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {LABELS[value] || value || '—'}
    </span>
  )
}
```

3. Wire into project rows for `stage` and `sales_owner`, subproject rows for `discipline`, `stage`, `responsible_partner`

4. For `stage` field, use the correct stage array based on entity type:
```tsx
options={isSubproject ? [...subprojectStages] : [...projectStages]}
```

5. Verify: `npm run build` passes, dropdowns appear on click

6. Commit: `feat(db-table): add inline dropdown editing`

---

## Task 7: Inline editing — currency and date

**Objective:** Currency fields (contract_amount, amount) show formatted BRL and edit as raw number. Date fields (deadline) show formatted date and edit as date input.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. For currency, create `EditableCurrency`:
```tsx
function EditableCurrency({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
}: {
  value: number
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCommit() }}
        className="w-full bg-white border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none text-right"
      />
    )
  }

  return (
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {formatCurrency(value)}
    </span>
  )
}
```

2. For date, create `EditableDate`:
```tsx
function EditableDate({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
}: {
  value: string | null
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value || ''}
        onChange={e => { onChange(e.target.value); onCommit() }}
        onBlur={onCommit}
        className="w-full bg-white border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      />
    )
  }

  return (
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {value ? formatDate(value) : '—'}
    </span>
  )
}
```

3. Wire currency into `contract_amount` (project) and `amount` (subproject)

4. Wire date into `deadline` (subproject)

5. Verify: `npm run build` passes

6. Commit: `feat(db-table): add currency and date inline editing`

---

## Task 8: Confirmation modal

**Objective:** Before saving, show a modal: "Alterar [field] de [old] para [new]?" with Confirmar/Cancelar.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Add modal state:
```tsx
const [confirmModal, setConfirmModal] = useState<{
  entity: Project | Subproject
  entityType: 'project' | 'subproject'
  field: string
  fieldLabel: string
  oldValue: string
  newValue: string
  oldValueRaw: string | number
  newValueRaw: string | number
} | null>(null)
```

2. Create `ConfirmModal` component:
```tsx
function ConfirmModal({
  modal,
  onConfirm,
  onCancel,
}: {
  modal: NonNullable<DatabasePageProps['confirmModal']>
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg)] border border-[var(--line)] p-6 max-w-md w-full mx-4 shadow-lg">
        <h2 className="text-base font-semibold text-[var(--ink)] mb-4">Confirmar alteração</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-1">
          Alterar <strong>{modal.fieldLabel}</strong> de <strong>{modal.oldValue}</strong> para <strong>{modal.newValue}</strong>?
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-[var(--teal)] text-white hover:opacity-90"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
```

3. Modify `handleCommit` to open modal instead of saving directly:
```tsx
const handleCommit = (
  entity: Project | Subproject,
  entityType: 'project' | 'subproject',
  field: string,
  fieldLabel: string,
  oldValue: string | number,
  newValue: string | number,
) => {
  if (String(oldValue) === String(newValue)) {
    setEditing(null)
    return
  }
  setEditing(null)
  setConfirmModal({
    entity,
    entityType,
    field,
    fieldLabel,
    oldValue: String(oldValue),
    newValue: String(newValue),
    oldValueRaw: oldValue,
    newValueRaw: newValue,
  })
}
```

4. Add `handleConfirm` that calls mutation:
```tsx
const handleConfirm = async () => {
  if (!confirmModal) return
  const { entity, entityType, field, newValueRaw } = confirmModal

  let action: string
  let payload: Record<string, unknown>

  if (entityType === 'project') {
    action = 'updateProject'
    payload = {
      id: entity.id,
      name: (entity as Project).name,
      code: (entity as Project).code,
      stage: (entity as Project).stage,
      contractAmount: (entity as Project).contract_amount,
      salesOwner: (entity as Project).sales_owner,
      [field === 'contract_amount' ? 'contractAmount' : field === 'sales_owner' ? 'salesOwner' : field]: newValueRaw,
    }
  } else {
    action = 'updateSubproject'
    payload = {
      id: entity.id,
      discipline: (entity as Subproject).discipline,
      amount: (entity as Subproject).amount,
      responsiblePartner: (entity as Subproject).responsible_partner,
      deadline: (entity as Subproject).deadline,
      [field === 'responsible_partner' ? 'responsiblePartner' : field]: newValueRaw,
    }
  }

  setConfirmModal(null)
  const ok = await submitMutation(action, payload)
  if (!ok) {
    toast.error('Erro ao salvar alteração')
  }
}
```

5. Render modal at the end of the component:
```tsx
{confirmModal && (
  <ConfirmModal
    modal={confirmModal}
    onConfirm={() => void handleConfirm()}
    onCancel={() => setConfirmModal(null)}
  />
)}
```

6. Verify: `npm run build` passes, editing a cell → modal appears → confirm saves

7. Commit: `feat(db-table): add confirmation modal for edits`

---

## Task 9: Error handling — revert on failure

**Objective:** If mutation fails, revert the cell to its original value and show toast error.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. In `handleConfirm`, the mutation call already returns a boolean. If `ok` is false, the data hasn't changed (submitMutation doesn't update `data` on failure), so the UI auto-reverts on next render.

2. Add explicit toast:
```tsx
if (!ok) {
  toast.error('Erro ao salvar alteração. Valor revertido.')
}
```

3. This works because `submitMutation` only calls `setData(next)` on success. On failure, `data` stays the old value, so the table re-renders with original values.

4. Verify: `npm run build` passes

5. Commit: `feat(db-table): add error revert handling`

---

## Task 10: Column sorting

**Objective:** Click column header to sort ascending/descending. Click again to toggle. Click third time to remove sort.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Add sort state:
```tsx
const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' } | null>(null)
```

2. Add sort toggle function:
```tsx
const toggleSort = (field: string) => {
  setSort(prev => {
    if (prev?.field !== field) return { field, dir: 'asc' }
    if (prev.dir === 'asc') return { field, dir: 'desc' }
    return null
  })
}
```

3. Sort projects:
```tsx
const sortedProjects = useMemo(() => {
  const list = [...data.projects]
  if (!sort) return list
  return list.sort((a, b) => {
    const aVal = a[sort.field as keyof Project]
    const bVal = b[sort.field as keyof Project]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sort.dir === 'asc' ? aVal - bVal : bVal - aVal
    }
    const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'pt-BR')
    return sort.dir === 'asc' ? cmp : -cmp
  })
}, [data.projects, sort])
```

4. Add sort indicator to headers:
```tsx
<th onClick={() => toggleSort(col.key)} className="cursor-pointer hover:text-[var(--ink)]">
  {col.label}
  {sort?.field === col.key && (
    <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>
  )}
</th>
```

5. Sortable columns: name, code, stage, contract_amount, sales_owner, client_name

6. Verify: `npm run build` passes, clicking headers sorts

7. Commit: `feat(db-table): add column sorting`

---

## Task 11: Search filter

**Objective:** Add a search input above the table that filters projects by name.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Add search state:
```tsx
const [search, setSearch] = useState('')
```

2. Filter projects:
```tsx
const filteredProjects = useMemo(() => {
  if (!search.trim()) return sortedProjects
  const q = search.toLowerCase()
  return sortedProjects.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.code && p.code.toLowerCase().includes(q)) ||
    (p.client_name && p.client_name.toLowerCase().includes(q))
  )
}, [sortedProjects, search])
```

3. Add search input above table:
```tsx
<div className="mb-4 flex items-center gap-3">
  <div className="relative flex-1 max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
    <input
      type="text"
      placeholder="Buscar projeto..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
    />
  </div>
</div>
```

4. Use `filteredProjects` instead of `sortedProjects` in the table body

5. Verify: `npm run build` passes, typing filters rows

6. Commit: `feat(db-table): add search filter`

---

## Task 12: Move "Database" to bottom of sidebar + user info below

**Objective:** In the sidebar, move the Database nav item to the bottom, separated from the main nav. Keep user info (name, email) aligned below it.

**Files:**
- Modify: `src/lib/constants.ts` (split NAV_ITEMS or add separate BOTTOM_NAV_ITEMS)
- Modify: `src/pages/ApoloWorkspace.tsx` (render bottom nav + user info together)

**Steps:**

1. In `constants.ts`, remove `database` from `NAV_ITEMS` and create:
```ts
export const BOTTOM_NAV_ITEMS = [
  { key: 'database', label: 'Database', href: '/app/database', icon: Table2 },
]
```

2. In `ApoloWorkspace.tsx` sidebar, after the main `<nav>` (line 515), replace the "User / actions" div with a combined bottom section:

```tsx
{/* Bottom nav + user info */}
<div className="mt-auto border-t border-[var(--line)]">
  <nav className="py-2">
    {BOTTOM_NAV_ITEMS.map((item) => {
      const Icon = item.icon
      return (
        <NavLink
          key={item.key}
          to={item.href}
          title={sidebarCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 border-l-2 transition-colors ${
              sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5 text-sm'
            } ${
              isActive
                ? 'border-l-[var(--teal)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
                : 'border-l-transparent text-[var(--ink-soft)] hover:bg-[var(--teal-active-bg)] hover:text-[var(--ink)]'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>{item.label}</span>}
        </NavLink>
      )
    })}
  </nav>

  {/* User info */}
  <div className={`border-t border-[var(--line)] transition-all duration-300 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
    {!sidebarCollapsed && (
      <div className="mb-3">
        <div className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">Sessão</div>
        <div className="mt-1.5 text-sm font-medium text-[var(--ink)]">{user.name}</div>
        <div className="text-xs text-[var(--ink-soft)]">{user.email}</div>
      </div>
    )}
    <div className={`flex gap-2 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
      <button onClick={() => void handleSair()} title="Sair" className={`inline-flex items-center border border-[var(--line)] text-[var(--ink-soft)] transition hover:text-[var(--ink)] ${sidebarCollapsed ? 'justify-center p-2' : 'gap-1.5 px-3 py-1.5 text-xs'}`}>
        <LogOut className="h-3.5 w-3.5" />
        {!sidebarCollapsed && 'Sair'}
      </button>
      <button onClick={toggleTheme} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} className={`inline-flex items-center border border-[var(--line)] text-[var(--ink-soft)] transition hover:text-[var(--ink)] ${sidebarCollapsed ? 'justify-center p-2' : 'gap-1.5 px-3 py-1.5 text-xs'}`}>
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {!sidebarCollapsed && (theme === 'dark' ? 'Claro' : 'Escuro')}
      </button>
    </div>
  </div>
</div>
```

3. Import `Table2` (or `Database`) from lucide-react, and `BOTTOM_NAV_ITEMS` from constants

4. Make sure the sidebar uses `flex flex-col` so `mt-auto` pushes the bottom section down

5. Verify: `npm run build` passes, Database at bottom, user info below it

6. Commit: `feat(db-table): move Database nav to sidebar bottom with user info`

---

## Task 13: Dark mode support

**Objective:** Ensure the table works correctly in both light and dark themes using CSS variables.

**Files:**
- Modify: `src/pages/DatabasePage.tsx`

**Steps:**

1. Audit all colors used — ensure they reference CSS variables:
   - Background: `var(--bg)`, `var(--paper)`
   - Text: `var(--ink)`, `var(--ink-soft)`
   - Borders: `var(--line)`
   - Accent: `var(--teal)`, `var(--teal-active-bg)`

2. Fix any hardcoded colors (e.g., `bg-white` in inline inputs → `bg-[var(--bg)]`)

3. Modal overlay: `bg-black/40` works in both themes

4. Verify: toggle theme, check all states (default, hover, editing, modal)

5. Commit: `fix(db-table): ensure dark mode compatibility`

---

## Task 14: Final validation

**Objective:** Full build, manual walkthrough, clean commit.

**Steps:**

1. `npm run build` — must pass with no errors

2. Manual test checklist:
   - [ ] Table renders with all projects
   - [ ] ▶/▼ toggle expands/collapses subprojects
   - [ ] Click name cell → input appears → type → Enter → modal → confirm → saves
   - [ ] Click code cell → input appears → same flow
   - [ ] Click stage cell → dropdown appears → select → modal → confirm → saves
   - [ ] Click contract_amount → number input → modal → confirm → saves
   - [ ] Click sales_owner → dropdown → modal → confirm → saves
   - [ ] Click discipline (subproject) → dropdown → modal → confirm → saves
   - [ ] Click deadline (subproject) → date input → modal → confirm → saves
   - [ ] Cancel in modal → no change
   - [ ] Search input filters projects by name/code/client
   - [ ] Column headers sort ascending/descending/none
   - [ ] Dark mode: all elements visible and correct
   - [ ] Sidebar: Database at bottom, user info below it
   - [ ] Mobile: table scrolls horizontally

3. Commit: `feat(db-table): Database page — inline editing, sorting, filtering`
