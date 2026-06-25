# Project Drive v1 — Implementation Plan

> **For Hermes:** Use `subagent-driven-development` if this plan is handed to another agent. Execute one task at a time, verify each slice, and keep the write path aligned with the existing `submitMutation -> /api/app/mutate -> getBootstrapData()` pattern.

**Goal:** Add a per-project public drive to Apolo Projetos with authenticated uploads in the logged-in app, public read-only access via `/app/drive/:projectCode?t=...`, inline PDF preview, QR code generation, and a toggle to take the drive offline.

**Architecture:** Use Turso for relational metadata and Vercel Blob for file binaries. Extend the existing project domain with drive access fields on `projects` plus a new `project_drive_files` table. Keep authenticated write operations inside the existing mutation/bootstrap flow for the internal app. Expose the public drive through dedicated unauthenticated read endpoints that validate `(project code + token + enabled flag)` before returning page data or file access.

**Tech Stack:** React 19, React Router, Vite, Vercel serverless handlers, `@libsql/client` (Turso), `@vercel/blob`, Tailwind CSS, lucide-react, existing auth/session helpers.

---

## Decisions Already Closed

These decisions came from the product interview and should be treated as fixed unless Matheus explicitly changes them:

- One drive per project.
- Public read-only drive; uploads only in the logged-in area.
- Public URL must be pretty and code-based: `/app/drive/:projectCode?t=<token>`.
- Token is fixed by default and regenerable manually.
- Each project needs a visible toggle to take the drive offline.
- All files attached to the project appear in the public drive.
- Files are grouped by subproject/discipline; also support a `Geral` bucket.
- Accept multiple file types.
- Inline preview only for PDF in v1.
- Multiple upload in one action.
- Each upload is a new independent file; no explicit version model.
- The public page should default to the most recent PDF in the selected bucket.
- Use the existing Apolo identity and the logo files already present under `public/`.
- Use the existing Turso database; store binaries in Vercel Blob.

---

## Compatibility Notes (important before implementation)

The current app has two relevant existing patterns:

1. Existing relational write flow:
   - `src/pages/ApoloWorkspace.tsx`
   - `src/lib/app-api.ts`
   - `api/app/mutate.js`
   - `api/_lib/mutations.js`
   - `api/_lib/app-data.js`

2. Existing file precedent for lead proposals:
   - `api/_lib/db.js` has `lead_proposals`
   - `api/_lib/mutations.js` has `uploadLeadProposal` / `deleteLeadProposal`
   - `api/app/proposal.js` serves PDF inline

Do **not** reuse the lead proposal storage strategy (base64 inside Turso) for the new drive. That pattern is acceptable for one-off proposal PDFs but is the wrong scaling model for a real drive. Reuse only the UX and endpoint concepts, not the persistence model.

Also note that public drive routes will be additive. They should not disturb:
- `/` marketing page
- `/app/*` logged-in workspace
- existing bootstrap payload consumers

---

## Proposed Data Model

### 1. Extend `projects`

Add the following columns in `api/_lib/db.js` migrations:

- `drive_enabled INTEGER NOT NULL DEFAULT 0`
- `drive_token TEXT`
- `drive_updated_at TEXT`

Rationale:
- `drive_enabled` powers the “tirar do ar” toggle.
- `drive_token` is the secret required in `?t=`.
- `drive_updated_at` helps auditing and allows UI copy like “link regenerated on ...” later.

Do **not** add a separate slug column in v1. Use the existing `projects.code` as the visible slug segment, because the requested URL shape is `/app/drive/243`. If a project has no usable `code`, the internal UI should block drive activation until a code exists.

### 2. New table: `project_drive_files`

Create a new table in `api/_lib/db.js`:

- `id TEXT PRIMARY KEY`
- `project_id TEXT NOT NULL`
- `subproject_id TEXT` (nullable = `Geral`)
- `filename TEXT NOT NULL`
- `blob_url TEXT NOT NULL`
- `blob_pathname TEXT NOT NULL`
- `mime_type TEXT`
- `size INTEGER NOT NULL DEFAULT 0`
- `uploaded_by TEXT`
- `uploaded_at TEXT NOT NULL`
- `sort_order INTEGER` (nullable; not used in v1 but harmless)
- foreign key to `projects(id)`
- foreign key to `subprojects(id)`

Indexes:
- `idx_project_drive_files_project_uploaded ON project_drive_files(project_id, uploaded_at DESC)`
- `idx_project_drive_files_subproject ON project_drive_files(subproject_id, uploaded_at DESC)`
- optional uniqueness on `blob_pathname` if desired

Rationale:
- `blob_url` allows direct rendering/opening.
- `blob_pathname` gives a stable handle for later delete/migration operations.
- `subproject_id NULL` maps to the `Geral` bucket.

---

## Proposed Route / API Shape

### Internal authenticated write/read helpers

Additive routes to register in `vite.config.ts` local API plugin and create under `api/app/`:

- `POST /api/app/drive-upload` — authenticated upload to Vercel Blob + metadata insert
- `POST /api/app/drive-delete` — authenticated delete/removal of one drive file
- `GET /api/app/drive-qr?projectId=...` — authenticated QR generation endpoint, or generate in client if preferred

Note: if the upload flow is implemented through `POST /api/app/mutate`, keep it there for consistency. But file uploads do **not** fit JSON body well. Prefer a dedicated `multipart/form-data` route for the binary upload, then call a normal mutation or direct metadata insert on the server.

### Public unauthenticated routes

Additive routes:

- `GET /api/public/drive/project?code=:code&t=:token`
  - returns public project metadata + grouped files, or 404/403-ish payload if unavailable
- `GET /api/public/drive/file?id=:fileId&t=:token`
  - validates token + enabled flag and then redirects to or proxies the blob URL

Why a file endpoint even if Blob gives URLs directly:
- centralizes token enforcement
- allows future provider swaps without changing the public page contract
- keeps the “toggle offline” effective even if the page knows a file id

Public React route:
- `src/App.tsx`: add `<Route path="/app/drive/:projectCode" element={<PublicProjectDrivePage />} />`

---

## UI Placement Strategy

Primary internal home for the feature:
- `src/pages/OperationsKanbanPage.tsx`

Reason:
- Drive is per project and grouped by subproject/discipline.
- `OperationsKanbanPage.tsx` already owns selected project state and the project detail modal (`ProjectDetailModal` around the component defined near line 662 in current file state).
- This is the least disruptive place to add a “Drive” section without inventing a new internal page.

Public page:
- create `src/pages/PublicProjectDrivePage.tsx`
- create reusable presentational pieces in `src/components/drive/` if the page grows

---

## Implementation Tasks

### Task 1: Add the storage dependency and helper abstraction

**Objective:** Introduce Vercel Blob behind a tiny helper layer so future storage changes do not leak across the app.

**Files:**
- Modify: `package.json`
- Create: `api/_lib/storage.js`

**Steps:**
1. Add `@vercel/blob` to `dependencies`.
2. Create `api/_lib/storage.js` with two exported helpers:
   - `uploadProjectDriveFile({ projectCode, originalFilename, contentType, buffer })`
   - `deleteProjectDriveFile({ blobUrl, blobPathname })`
3. Inside the helper, isolate all provider-specific code and environment assumptions.
4. Use a deterministic pathname prefix like:
   - `projects/<projectCode>/<timestamp>-<sanitized-filename>` for Geral
   - `projects/<projectCode>/<subprojectId>/<timestamp>-<sanitized-filename>` for discipline buckets
5. Return normalized metadata at minimum:
   - `url`
   - `pathname`
   - `contentType`
   - `size`

**Verification:**
- `npm install`
- `npm run build`

**Commit:**
- `feat(drive): add vercel blob storage helper`

---

### Task 2: Extend the database schema for drive metadata

**Objective:** Make the Turso schema capable of storing drive state and files.

**Files:**
- Modify: `api/_lib/db.js`
- Modify: `api/_lib/db.test.js` or create a new focused schema test

**Steps:**
1. Add `project_drive_files` creation SQL to `schemaStatements`.
2. Add additive migrations for the new `projects` columns:
   - `drive_enabled`
   - `drive_token`
   - `drive_updated_at`
3. Add indexes for the new table.
4. Follow the repo’s existing additive migration pattern (`ensureColumn`, repair on cold start).
5. Add/extend a schema test proving the repaired schema contains the new columns/table even when `schema_version`-style drift already exists.

**Verification:**
- `node --test api/_lib/db.test.js`
- `npm run build`

**Commit:**
- `feat(drive): add project drive schema`

---

### Task 3: Extend bootstrap data and TypeScript types

**Objective:** Make the logged-in app aware of drive state and files through the existing bootstrap snapshot.

**Files:**
- Modify: `api/_lib/app-data.js`
- Modify: `src/types/app.ts`

**Steps:**
1. In `src/types/app.ts`, extend `Project` with:
   - `drive_enabled: boolean`
   - `drive_token: string | null` (logged-in only)
   - `drive_updated_at: string | null`
2. Add a new type:
   - `ProjectDriveFile`
3. Add `projectDriveFiles: ProjectDriveFile[]` to `BootstrapData`.
4. In `api/_lib/app-data.js`, include the new project columns in the `projects` query.
5. Add a new query for `project_drive_files`, ordered by `uploaded_at DESC`.
6. Return `projectDriveFiles` in the bootstrap payload.

**Verification:**
- `npm run build`
- confirm no TypeScript errors in `ApoloWorkspace` consumers after adding the new bootstrap field

**Commit:**
- `feat(drive): expose drive metadata in bootstrap`

---

### Task 4: Add drive mutations for enable/disable and token regeneration

**Objective:** Support the two project-level control actions requested in the interview.

**Files:**
- Modify: `api/_lib/mutations.js`
- Modify: `api/_lib/mutations.test.js`

**Steps:**
1. Add a reusable token generator helper near the existing id helpers.
2. Add mutation: `setProjectDriveEnabled`
   - payload: `{ projectId, enabled }`
3. Add mutation: `regenerateProjectDriveToken`
   - payload: `{ projectId }`
4. Rules:
   - turning drive on should create a token if one does not exist
   - turning drive off should keep the token intact; only access changes
   - regenerating token should overwrite the old one and update `drive_updated_at`
5. Update the project row `updated_at` when appropriate.
6. Add tests for:
   - enable creates token
   - disable preserves token but blocks via enabled flag later
   - regenerate changes token

**Verification:**
- `node --test api/_lib/mutations.test.js`
- `npm run build`

**Commit:**
- `feat(drive): add project drive control mutations`

---

### Task 5: Implement authenticated upload and delete endpoints for drive files

**Objective:** Support binary upload in the logged-in app without abusing the JSON mutation endpoint.

**Files:**
- Create: `api/app/drive-upload.js`
- Create: `api/app/drive-delete.js`
- Modify: `vite.config.ts`
- Modify: `api/_lib/http.js` only if a helper is needed
- Modify: `api/_lib/db.js` / `api/_lib/mutations.js` only if shared helpers become necessary

**Steps:**
1. Register the new routes in `vite.config.ts`.
2. `drive-upload.js` should:
   - require session
   - parse multipart form data or another deliberate binary upload shape
   - enforce max file size: `100 MB per file`
   - accept multiple files in one request
   - require `projectId`
   - accept optional `subprojectId` (`null` => Geral)
   - validate that `subprojectId` belongs to the project if provided
   - upload each file to Vercel Blob via `api/_lib/storage.js`
   - insert rows into `project_drive_files`
   - return a fresh bootstrap payload or a success payload the client can follow with `getBootstrap()`
3. `drive-delete.js` should:
   - require session
   - validate file ownership/project linkage
   - delete blob
   - delete row from `project_drive_files`
4. Keep the endpoint response shape simple and explicit.

**Verification:**
- `npm run build`
- manual upload in local dev with a small PDF and image

**Commit:**
- `feat(drive): add authenticated project drive file endpoints`

---

### Task 6: Add internal client API helpers for the new endpoints

**Objective:** Let the React app call the drive endpoints cleanly.

**Files:**
- Modify: `src/lib/app-api.ts`

**Steps:**
1. Add helper `uploadProjectDriveFiles(formData: FormData)`.
2. Add helper `deleteProjectDriveFile(id: string)`.
3. Reuse credentials/cookie behavior.
4. Keep JSON request helper untouched; add a specific fetch path for multipart.

**Verification:**
- `npm run build`

**Commit:**
- `feat(drive): add frontend drive api helpers`

---

### Task 7: Add internal drive UI to the project detail modal in Operations

**Objective:** Give the logged-in team a clear place to manage drive files on each project.

**Files:**
- Modify: `src/pages/OperationsKanbanPage.tsx`
- Create optional components under: `src/components/drive/`

**Steps:**
1. In `OperationsKanbanPage.tsx`, derive files for `selectedProject` from `data.projectDriveFiles`.
2. Add a new section/tab/card inside `ProjectDetailModal`:
   - Drive status toggle
   - public link field + copy button
   - regenerate token button
   - QR button/preview
   - upload area with multiple file support
   - bucket selector: `Geral` or one of the project’s subprojects
   - grouped file lists by bucket
3. Make the drive section highly visible when `drive_enabled` is off.
4. UX rules:
   - if `project.code` is empty, disable activation and show message: project needs code first
   - if uploading, show pending state and toast feedback
   - if deleting, require explicit confirmation
5. Prefer a compact first version over an over-designed tab system.

**Verification:**
- `npm run dev`
- select a project, enable drive, upload multiple files to Geral and one discipline bucket
- refresh and confirm bootstrap rehydrates the state correctly

**Commit:**
- `feat(drive): add internal project drive management ui`

---

### Task 8: Generate a QR code from the public URL

**Objective:** Surface a project QR code inside the logged-in drive UI.

**Files:**
- Modify: `package.json` if a QR dependency is added
- Modify: `src/pages/OperationsKanbanPage.tsx`
- Create optional component: `src/components/drive/project-drive-qr.tsx`

**Steps:**
1. Choose one simple QR rendering approach in React.
2. Build the public URL from:
   - `window.location.origin`
   - `/app/drive/${project.code}`
   - `?t=${project.drive_token}`
3. Show the QR only when:
   - `project.code` exists
   - `project.drive_token` exists
4. Also show a plain copyable URL next to the QR.
5. If Matheus later wants downloadable PNG, make that a follow-up, not part of v1 core.

**Verification:**
- `npm run build`
- QR opens the public drive page correctly on a phone

**Commit:**
- `feat(drive): add project drive qr code`

---

### Task 9: Add the public drive API readers with token validation

**Objective:** Power the unauthenticated public page and file access safely.

**Files:**
- Create: `api/public/drive/project.js`
- Create: `api/public/drive/file.js`
- Modify: `vite.config.ts`
- Create optional shared helper: `api/_lib/public-drive.js`

**Steps:**
1. Register both routes in `vite.config.ts`.
2. Add a shared helper that resolves a project by:
   - `projects.code = :code`
   - `drive_enabled = 1`
   - `drive_token = :token`
3. `project.js` should return only public-safe fields:
   - project name
   - project code
   - client_name
   - subprojects relevant for grouping
   - grouped file metadata
   - maybe counts / last updated
4. `file.js` should:
   - validate the same `(code or file -> project) + token + enabled`
   - redirect to the blob URL or stream the blob
5. Offline behavior when disabled:
   - return a controlled payload/status that the public page can render as “Drive indisponível”

**Verification:**
- `npm run dev`
- hit the endpoints with valid token, invalid token, and disabled drive

**Commit:**
- `feat(drive): add public drive read endpoints`

---

### Task 10: Add the public React page with beautiful header and grouped buckets

**Objective:** Render the read-only public drive experience requested in the interview.

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/PublicProjectDrivePage.tsx`
- Create optional components under: `src/components/drive/`
- Reuse assets from: `public/logo-apolo.png`, `public/logo-apolo-darkmode.png`

**Steps:**
1. Add route in `src/App.tsx`:
   - `/app/drive/:projectCode`
2. Build `PublicProjectDrivePage.tsx` that:
   - reads `projectCode` from params
   - reads `t` from search params
   - fetches `/api/public/drive/project?...`
   - renders loading, unavailable, invalid-token, and success states
3. Header should include:
   - Apolo branding/logo
   - project name
   - client name
   - project code
   - available discipline buckets
4. Bucket navigation:
   - `Geral`
   - one section per subproject/discipline
5. File list per bucket:
   - filename
   - uploaded date
   - size
   - file type
   - action buttons
6. PDF preview area:
   - default to the most recent PDF in selected bucket
   - if no PDF exists, show a friendly empty preview state
7. Other file types:
   - open/download action via the public file endpoint
8. Make the layout mobile-friendly because QR scans often land on phones.

**Verification:**
- `npm run build`
- test on desktop and mobile viewport
- scan QR and confirm landing page is usable on phone

**Commit:**
- `feat(drive): add public project drive page`

---

### Task 11: Add guardrails and polish the unhappy paths

**Objective:** Make the feature operationally safe.

**Files:**
- Modify as needed in:
  - `src/pages/OperationsKanbanPage.tsx`
  - `src/pages/PublicProjectDrivePage.tsx`
  - `api/app/drive-upload.js`
  - `api/public/drive/project.js`
  - `api/public/drive/file.js`

**Steps:**
1. Enforce `100 MB` max per file server-side.
2. Validate `subprojectId` belongs to the selected project.
3. Block drive activation if `project.code` is missing or blank.
4. Show explicit disabled/offline state publicly when `drive_enabled = 0`.
5. Ensure token comparison is exact and required for every public read path.
6. Ensure deleting a file removes it from both blob storage and Turso metadata.
7. Keep all public responses free of internal-only fields like `drive_token` in the JSON body unless absolutely necessary.

**Verification:**
- manually test:
  - no token
  - wrong token
  - disabled project
  - project without code
  - upload to wrong subproject id

**Commit:**
- `fix(drive): harden access control and validations`

---

### Task 12: Add focused tests for the new server behavior

**Objective:** Cover the highest-risk business rules without inventing a huge test harness.

**Files:**
- Create: `api/_lib/drive.test.js` and/or extend `api/_lib/mutations.test.js`

**Recommended coverage:**
1. enabling drive creates token
2. regenerating token changes token
3. disabled drive fails public resolution
4. wrong token fails public resolution
5. `subproject_id = NULL` maps to Geral bucket
6. files are ordered newest-first in public payload

**Verification:**
- `node --test api/_lib/db.test.js api/_lib/mutations.test.js api/_lib/drive.test.js`
- `npm run build`

**Commit:**
- `test(drive): cover public access and project drive rules`

---

## Suggested File List Summary

Likely touched files:

- `package.json`
- `vite.config.ts`
- `src/App.tsx`
- `src/lib/app-api.ts`
- `src/types/app.ts`
- `src/pages/OperationsKanbanPage.tsx`
- `src/pages/PublicProjectDrivePage.tsx`
- `src/components/drive/*`
- `api/_lib/db.js`
- `api/_lib/app-data.js`
- `api/_lib/mutations.js`
- `api/_lib/storage.js`
- `api/_lib/public-drive.js`
- `api/app/drive-upload.js`
- `api/app/drive-delete.js`
- `api/public/drive/project.js`
- `api/public/drive/file.js`
- `api/_lib/db.test.js`
- `api/_lib/mutations.test.js`
- `api/_lib/drive.test.js`

---

## Acceptance Criteria

The feature is done when all of the following are true:

1. A logged-in user can open a project in Operations and see a Drive section.
2. A project drive can be enabled/disabled with a toggle.
3. A project without `code` cannot expose a public drive.
4. The UI shows a stable public URL using `/app/drive/:projectCode?t=...`.
5. The UI renders a QR code for that URL.
6. The logged-in user can upload multiple files to `Geral` or a specific discipline/subproject.
7. Uploaded files are stored in Vercel Blob and indexed in Turso metadata.
8. The public drive page works without login when token is valid and drive is enabled.
9. The public drive page groups files by `Geral` and discipline buckets.
10. PDFs preview inline on the public page.
11. Other file types can be opened/downloaded.
12. Disabling the drive makes the public page inaccessible immediately.
13. Regenerating the token invalidates the old QR/link.

---

## Verification Checklist

Run before shipping:

```bash
npm run build
node --test api/_lib/db.test.js api/_lib/mutations.test.js api/_lib/drive.test.js
```

Manual checks:
- enable drive on a coded project
- upload 2+ files at once
- upload to `Geral` and to a discipline bucket
- copy public URL and open in incognito
- scan QR from phone
- confirm newest PDF auto-preview behavior
- turn drive off and confirm public page stops working
- regenerate token and confirm old link fails

---

## Rollout Notes

- Keep this feature additive; do not refactor unrelated pages during v1.
- Do not migrate the existing `lead_proposals` feature in the same PR.
- If Vercel Blob implementation details differ from assumption, fix them inside `api/_lib/storage.js`, not across the feature surface.
- If multipart upload handling becomes messy in pure serverless handlers, preserve the contract and narrow the workaround to the upload endpoint only.

---

## Handoff Note for Another Agent

If another agent picks this up later, the safest execution order is:
1. schema + types
2. project-level controls (enable/token)
3. upload/delete endpoints + storage helper
4. internal Operations UI
5. public read endpoints
6. public page + QR
7. tests + polish

Do not start with the public page before the token validation and metadata model exist.
