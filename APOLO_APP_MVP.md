# Apolo App MVP

## Goal
Build an internal platform for Apolo Projetos under `/app`, keeping the institutional site at `/`.

The app is split into 3 cores:

1. **Commercial** — leads, clients, proposals, who brought the deal
2. **Operations** — projects, stage, pending items, received materials, deadlines
3. **Financial** — contract amount, receipts, expenses, partner payouts, cashflow

## Technical direction
- Existing repo stays in Vite + React
- Public site remains at `/`
- Internal app lives at `/app`
- Backend uses Vercel Functions
- Database uses Turso with raw SQL (no ORM for MVP)
- Auth uses env-defined users + signed session cookie
- File storage can start inside Turso-backed records / metadata-first flow and evolve later

## MVP modules

### 1) Dashboard
- KPI cards
- project strip with commercial / operations / financial state
- recent cash movements
- upcoming deadlines / pending items

### 2) Commercial
- leads list
- proposal stage
- estimated amount
- source
- who sold it
- quick conversion to project when needed

### 3) Operations
- projects list
- current stage
- discipline
- deadline
- received materials log
- pending items log
- internal notes

### 4) Financial
- contract amount by project
- receipt log (amount, bank account, date, note)
- expense log (amount, category, date, bank account, note)
- partner payout log (partner, amount, date, bank account, note)

### 5) Cashflow
- unified ledger of:
  - client receipts
  - project expenses
  - partner payouts
- monthly totals
- net cash
- outstanding amount by project

## Business assumptions for MVP
- Internal use only
- 3 partners only
- No granular permissions yet
- All authenticated users can see everything
- `received` means money actually paid by the client
- partner payouts are tracked as logs, including partial payments
- receipts are tracked as logs, including partial payments
- default partner split is 50%
- sale bonus is +10% for the partner who brought the client
- payout rule display can start as informational if final automatic split logic needs tuning later

## Initial data model

### users
- email
- name

### clients
- id
- name
- company_name
- contact_name
- phone
- email
- notes
- created_at

### leads
- id
- client_id
- title
- stage
- source
- estimated_amount
- sales_owner
- notes
- created_at

### projects
- id
- client_id
- name
- code
- discipline
- stage
- contract_amount
- sales_owner
- sales_bonus_percent
- base_partner_split_percent
- deadline
- status_note
- created_at
- updated_at

### project_logs
Used for operations history.
- id
- project_id
- log_type (`pending`, `received_material`, `note`, `delivery`, `revision`)
- title
- details
- due_date
- status
- created_by
- created_at

### payment_receipts
- id
- project_id
- amount
- bank_account
- received_at
- note
- created_by
- created_at

### project_expenses
- id
- project_id
- amount
- category
- bank_account
- paid_at
- vendor
- note
- created_by
- created_at

### partner_payouts
- id
- project_id
- partner_name
- amount
- bank_account
- paid_at
- note
- created_by
- created_at

## API shape
- auth session endpoints
- bootstrap endpoint for dashboard + app data
- mutate endpoint for create/update actions

## Environment variables
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `APP_AUTH_SECRET`
- `APP_USER_1_EMAIL`
- `APP_USER_1_PASSWORD`
- `APP_USER_1_NAME`
- `APP_USER_2_EMAIL`
- `APP_USER_2_PASSWORD`
- `APP_USER_2_NAME`
- `APP_USER_3_EMAIL`
- `APP_USER_3_PASSWORD`
- `APP_USER_3_NAME`

## Implementation order
1. Preserve site and add router
2. Create `/app` shell and login flow
3. Create Turso schema bootstrap + auth helpers
4. Build dashboard
5. Build commercial page
6. Build operations page
7. Build financial page
8. Build cashflow page
9. Validate build and deploy

## Notes
- Keep the interface close to Apolo’s brand but make the app feel like an operations desk, not a landing page.
- Prefer logs as the source of truth and compute summaries from them.
- Avoid overengineering; this is an MVP.
