# Folio - Roadmap

## Folio — Feature Implementation TODO List (Learning-first MVP)

### 0) Repo & product baseline

* [x] Rename visible product references to **Folio** (app titles, meta titles, package display names)
  > Done: 更新了所有 package.json 中的包名从 `@ai-start/*` 到 `@folio/*`，更新了 app.json 中的应用名称和 scheme，更新了 Web 应用标题
* [x] Define MVP scope in `docs/mvp.md` (what's in / out)
  > Done: 创建了 `docs/mvp.md`，定义了 MVP 范围内外的功能、成功标准和技术栈
* [x] Add basic `CONTRIBUTING.md` (run, format, commit conventions)
  > Done: 创建了 `CONTRIBUTING.md`，包含开发环境设置、项目结构、代码规范和提交规范
* [x] Add `LICENSE` (even if provisional)
  > Done: 添加了 MIT License

### 1) Data model (Drizzle + Postgres)

* [ ] Create tables (minimal, MVP)
  * [ ] `users` (if not provided by auth layer)
  * [ ] `entries` (learning notes)
  * [ ] `tags`
  * [ ] `entry_tags` (many-to-many)
  * [ ] `sources` (link/PDF/book/chapter)
  * [ ] `attachments` (image/file metadata)
  * [ ] `entry_sources` (many-to-many)
  * [ ] `review_events` (timestamped “revisit”)
  * [ ] `daily_logs` (optional MVP, can be Phase 1.5)
* [ ] Add indexes
  * [ ] `entries.user_id, entries.updated_at`
  * [ ] `tags.user_id, tags.name`
  * [ ] join tables composite indexes
* [ ] Add soft-delete fields (recommended)
  * [ ] `deleted_at` for `entries`, `sources`, `attachments`
* [ ] Add migration workflow conventions (push vs migrations) and document it

### 2) Auth & identity (Better Auth)

* [ ] Confirm auth flows for Web and Native
  * [ ] Sign up / sign in / sign out
  * [ ] Session persistence
* [ ] Protect API routes (user-scoped access control)
* [ ] Add “current user” endpoint (`/me`)

### 3) API layer (Hono + oRPC)

* [ ] Define DTOs / schemas (zod or equivalent)
* [ ] Entries API
  * [ ] Create entry (supports “Inbox” default)
  * [ ] Update entry
  * [ ] Delete entry (soft delete)
  * [ ] Get entry by id
  * [ ] List entries (filters: tag, source, date range, inbox only)
* [ ] Tags API
  * [ ] Create/update/delete tag
  * [ ] List tags (with counts)
  * [ ] Attach/detach tag to entry
* [ ] Sources API
  * [ ] Create/update/delete source
  * [ ] Link/unlink source to entry
  * [ ] List sources
* [ ] Attachments API (metadata + upload)
  * [ ] Create upload intent (pre-signed URL later; dev local now)
  * [ ] Confirm upload + link attachment to entry
  * [ ] Fetch attachment list per entry
* [ ] Review API
  * [ ] Add review event for an entry
  * [ ] “Review queue” endpoint (recent, starred, needs revisit)
* [ ] Basic search API
  * [ ] Query by keyword (title/content)
  * [ ] Return highlighted snippets (optional)

### 4) Web app (TanStack Start) — “Organize & Review”

* [ ] App shell + navigation
  * [ ] Inbox
  * [ ] Library
  * [ ] Sources
  * [ ] Tags
  * [ ] Review
  * [ ] Insights (minimal)
* [ ] Inbox page
  * [ ] List inbox entries
  * [ ] Bulk actions: tag, assign source, mark processed
* [ ] Entry editor
  * [ ] Markdown editor (or rich text, but pick one)
  * [ ] Tag picker (create-on-type)
  * [ ] Source linking UI
  * [ ] Attachment gallery
  * [ ] Star / pin / bookmark (simple boolean)
* [ ] Library page
  * [ ] Filters (tag/source/date)
  * [ ] Sorting (updated, created)
  * [ ] Pagination / infinite scroll
* [ ] Sources page
  * [ ] Create/edit sources (link/file/book)
  * [ ] View source detail + linked entries
* [ ] Tags page
  * [ ] Tag management
  * [ ] Tag detail + linked entries
* [ ] Review page (MVP)
  * [ ] “Today” queue
  * [ ] Mark as reviewed (creates review event)
* [ ] Insights page (MVP)
  * [ ] Weekly capture count
  * [ ] Top tags distribution

### 5) Mobile app (Expo) — “Capture & Daily loop”

* [ ] Auth screens + session restore
* [ ] Capture flows
  * [ ] Quick text capture → creates inbox entry
  * [ ] Share extension / share sheet (text + URL) → inbox entry
  * [ ] Photo capture → upload + create attachment + link to entry
* [ ] Inbox list (mobile)
  * [ ] View/edit entry (light editor)
  * [ ] Quick tag assign
* [ ] Today tab (MVP)
  * [ ] Entries created today
  * [ ] Quick “reviewed” button
* [ ] Offline safety (MVP-friendly)
  * [ ] Local pending queue for creates/updates when offline
  * [ ] Retry sync when network returns

### 6) Attachments (images/files) — end-to-end

* [ ] Decide storage for MVP
  * [ ] Dev: local filesystem or simple object storage emulator
  * [ ] Prod-ready path: S3/R2 compatible (later)
* [ ] Implement upload pipeline
  * [ ] Mobile: upload with progress + retry
  * [ ] Server: validate mime/size, store metadata
  * [ ] Web: display thumbnails + full view
* [ ] Security
  * [ ] User-scoped access checks for attachment URLs
  * [ ] Size limits + type allowlist

### 7) Search (MVP)

* [ ] Web search bar (global)
* [ ] Server-side search
  * [ ] Basic SQL `ILIKE` first (MVP)
  * [ ] Upgrade path documented (Postgres FTS) for Phase 2
* [ ] Search result UX
  * [ ] Show entry title + snippet + tags

### 8) Review workflow (lightweight, MVP)

* [ ] Define “needs revisit” logic (simple rules)
  * [ ] New entries in last \(n\) days
  * [ ] Starred entries
  * [ ] Entries not reviewed in \(n\) days
* [ ] One-click “Reviewed” action (creates `review_event`)
* [ ] Review history on entry detail

### 9) Sync & consistency

* [ ] Standardize timestamps (`created_at`, `updated_at`)
* [ ] Last-write-wins strategy (documented)
* [ ] Minimal conflict handling
  * [ ] If update fails due to version mismatch, keep local copy and prompt “duplicate entry” resolution (simple MVP)

### 10) Quality, DX, and release readiness

* [ ] Seed script for demo data
* [ ] Error handling
  * [ ] API error envelopes
  * [ ] Web toast notifications
  * [ ] Mobile inline errors + retry states
* [ ] Logging
  * [ ] Server request logging
  * [ ] Client error boundary
* [ ] Testing (minimal but real)
  * [ ] DB schema tests (optional)
  * [ ] API smoke tests (critical)
* [ ] Performance
  * [ ] Web list virtualization or pagination
  * [ ] Cache tags + sources lists
* [ ] Deployment checklist
  * [ ] Environment variables documented
  * [ ] DB migrations runbook
  * [ ] Build pipeline for web/server
  * [ ] Expo build notes for native

---

## Suggested implementation order (fastest to usable)

* [ ] 1) Data model + Auth + Entries CRUD (API + Web)
* [ ] 2) Web Inbox + Editor + Tags
* [ ] 3) Mobile Quick Capture (text + share sheet)
* [ ] 4) Sources linking + basic Search
* [ ] 5) Attachments (photo → entry)
* [ ] 6) Review queue + Insights
