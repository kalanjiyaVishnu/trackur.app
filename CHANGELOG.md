# Changelog

## [2.0.1](https://github.com/emanuel-gold/trackur.app/compare/v2.0.0...v2.0.1) (2026-07-15)


### Bug Fixes

* merge-import toast reports actual inserted and skipped counts. ([0be18bc](https://github.com/emanuel-gold/trackur.app/commit/0be18bc5b231da08e88ceb024091427f4fa2a49c))

## [2.0.0](https://github.com/emanuel-gold/trackur.app/compare/trackur-v1.2.0...v2.0.0) (2026-07-13)


### ⚠ BREAKING CHANGES

* Job saves now send `posting_url` and `archived_at`, so the schema changes versioned in `supabase/migrations/` must be applied **before** deploying this release — saves fail against a database without those columns.

### Features

* stage history: `job_events` table written by a security-definer DB trigger, capturing drag-drop, edit panel, and CSV imports alike; read-only History timeline in EditJobModal ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* stats view (third view toggle): KPI tiles, applications-per-week SVG chart, stage distribution, average time-in-stage from `job_events` ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* archive: archive/unarchive in EditJobModal, archived jobs hidden by default with a toolbar/overflow toggle to view them ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* due-date surfacing: amber "N due" toolbar pill that filters to jobs with steps due today or earlier ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* posting URL: field in Add/Edit (bare domains auto-prefixed `https://`), link-out on cards, CSV column; links render only for http(s) URLs ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* optimistic job mutations: `updateJob`/`deleteJob` apply locally first, roll back and rethrow on failure ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* "No jobs match" empty state with a Clear filters button when filters yield zero results ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))
* overdue todo due dates render red on cards, table, and edit panel ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))


### Security

* HMAC-sign OAuth state (keyed off `GOOGLE_CLIENT_SECRET`) and verify signature + 10-min freshness in the gdrive callback; `postMessage` now targets the app origin instead of the wildcard; error page escapes HTML ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))
* resume upload hardening: magic-byte validation (PDF/DOCX signatures), server-side 10-file limit via R2 prefix count, oversized bodies aborted while streaming ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))
* JWT verification now validates issuer + audience, not just signature/expiry ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))
* security headers in `vercel.json`: CSP frame-ancestors, X-Frame-Options, nosniff, Referrer-Policy, HSTS, Permissions-Policy ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))


### Bug Fixes

* extract shared `downloadResume` util, replacing 3 duplicated copies; download errors now surface inline instead of failing silently ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))
* add top-level ErrorBoundary so render errors no longer white-screen the app ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))


### Performance Improvements

* memoize per-card resume lookups in KanbanBoard (Map instead of repeated `.find` scans) ([db49bc7](https://github.com/emanuel-gold/trackur.app/commit/db49bc7ce632e2762820f57b17ffe486627a30a9))


### Code Refactoring

* `GDriveContext` replaces the 4 gdrive props drilled through AddJobForm, JobFormFields, EditJobModal, ResumesModal, SettingsModal, and ResumePickerSection ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))
* App.jsx state extracted into `useJobFilters` (search/stage/due/archived filters + persisted table sort) and `useModals` hooks ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))


### Tests

* Vitest bootstrap (`npm test`): 32 tests over csvService escaping/parsing/round-trips, `toApp`/`toDb` mappers, download filename, URL normalization ([45726a8](https://github.com/emanuel-gold/trackur.app/commit/45726a866c12430635e2d784374aa65430035fce))

## [1.2.0](https://github.com/emanuel-gold/trackur.app/compare/trackur-v1.1.0...trackur-v1.2.0) (2026-07-12)


### Features

* adding app version number to Settings Modal via Vite define ([ab6fb18](https://github.com/emanuel-gold/trackur.app/commit/ab6fb18145d6a7a46b532cff216016acd2587c00))
* implemented editable name change fields to allow name edits in Settings menu ([f632715](https://github.com/emanuel-gold/trackur.app/commit/f632715a56086d2ee94d9819849187aad24ed76f))


### Bug Fixes

* increasing size of pencil icon on editable fields ([4656533](https://github.com/emanuel-gold/trackur.app/commit/46565331e123fb878ffa9d93de6d15867c7e3306))

## [1.1.0](https://github.com/emanuel-gold/trackur.app/compare/trackur-v1.0.0...trackur-v1.1.0) (2026-04-24)


### Features

* add "Remove From Job" action to resume menu in EditJobModal ([a345489](https://github.com/emanuel-gold/trackur.app/commit/a345489b7492791e3a0573484cc24b124ded1c8b))
* adding "add job" button directly to Kanban stages. ([94e8e2c](https://github.com/emanuel-gold/trackur.app/commit/94e8e2cb2bca350b237b92bb123ac32bcbeeca4d))
* adding pause to Toast container timeout when mouse enters ([383e454](https://github.com/emanuel-gold/trackur.app/commit/383e45454fc1b2580748c30d1dbafffa78ee1567))
* changing the addjobform to use the same modal as the editjobmodal, employing the new resume picker and slideout modules ([a882996](https://github.com/emanuel-gold/trackur.app/commit/a882996a090b18076ab6d8b42ecb7c2b7fd4e753))
* close ResumesModal when clicking outside the panel. ([53b50c2](https://github.com/emanuel-gold/trackur.app/commit/53b50c212cb6edfb50257150b5c368c045c11b97))
* Collapsible Stage columns ([2537991](https://github.com/emanuel-gold/trackur.app/commit/2537991396a8bb5755e0d4be5b5ba22783ea6e6a))
* expanded new addjob button touch targets via Catalyst "TouchTarget" ([f1f9ea0](https://github.com/emanuel-gold/trackur.app/commit/f1f9ea018daad05915977a13c6ec1ce838cc4920))
* refactoring next steps into a to-do list with notifications ([d7428cf](https://github.com/emanuel-gold/trackur.app/commit/d7428cfd7cb629560d2662b718c5fbbd82c0512a))
* show Google Drive / Trackur source icon next to resume names ([4cfa6d2](https://github.com/emanuel-gold/trackur.app/commit/4cfa6d2fc02572d8581f0f8efc3f3165e0e13d51))


### Bug Fixes

* Add origin validation to handleMessage; handling linked gdrive file row state ([1aa75d3](https://github.com/emanuel-gold/trackur.app/commit/1aa75d3bd6935ccc4d79fbcb389beede5195c084))
* adding aria labels ([f5eb17b](https://github.com/emanuel-gold/trackur.app/commit/f5eb17b092b28952e6d4c290bedbab729182c865))
* adding margin to jobcard to accomodate outline ring ([9838580](https://github.com/emanuel-gold/trackur.app/commit/98385804d81d46407e9626736484245458e7ed6b))
* Adding Multiline Boolean prop to prevent notes from truncating incorrectly ([4e2f40e](https://github.com/emanuel-gold/trackur.app/commit/4e2f40efad1a86f7f9df6a2a24f639fc610daa25))
* adding name attribute to job stage select ([0ea26fd](https://github.com/emanuel-gold/trackur.app/commit/0ea26fd5c8494b2f2f10698601baf3064e544780))
* Adding onBlur to all 6 InlineEditableField instances in JobCard ([792569c](https://github.com/emanuel-gold/trackur.app/commit/792569c53fcc35125ef6ef6940625d4d3c1f72cd))
* adding padding to AddJobForm to prevent scrollbar rubbing against form ([1b261d2](https://github.com/emanuel-gold/trackur.app/commit/1b261d287174910129011d1e753a6bb3b4b3702a))
* centering and increasing z-index for Toast notifications ([aea4fb0](https://github.com/emanuel-gold/trackur.app/commit/aea4fb091075ca1323c23ae8777001d2fa8609fc))
* downgraded Google Drive API scope to non-restricted "drive.file" ([25cd6a6](https://github.com/emanuel-gold/trackur.app/commit/25cd6a65dac4252177ba230220c599d4ef1b5992))
* error toast symbol and color ([82e5b2e](https://github.com/emanuel-gold/trackur.app/commit/82e5b2e7a793344e3a56cdb71198bc63b2d861b0))
* **gdrive:** auto-attach picker selection + dedupe Drive resumes ([b61c14c](https://github.com/emanuel-gold/trackur.app/commit/b61c14cecc0a31999541222d66485cd22ac3d9c6))
* increasing contrast ([3c73829](https://github.com/emanuel-gold/trackur.app/commit/3c738292ee36153e7ef3cdde535f5383e0bf858f))
* increasing padding so scroll bar has breathing room ([555b606](https://github.com/emanuel-gold/trackur.app/commit/555b60661c054a8874422687424772f3849da4f6))
* lazy loading and suspense for module performance ([aa73ce2](https://github.com/emanuel-gold/trackur.app/commit/aa73ce211b5a84003640bbc89c8f9c0084f2e104))
* moving picker title and nav_hidden to PickerBuilder ([f10bd0e](https://github.com/emanuel-gold/trackur.app/commit/f10bd0eeee8cc504c3da1e8be196d808ba81ea3d))
* Truncate role/company in table view ([0dd2a39](https://github.com/emanuel-gold/trackur.app/commit/0dd2a396550a33029214830e274ff08e3f126cd6))
* useJobs.js fixed to accept a userId parameter and uses [userId] to fetch jobs on load ([f96f098](https://github.com/emanuel-gold/trackur.app/commit/f96f098f2af7e89f0469f81e11580086ef37d88e))
* wrapping toast in &lt;Portal&gt; to prevent "inert" being applied when modals are open ([eae0e8f](https://github.com/emanuel-gold/trackur.app/commit/eae0e8fad64bcf19d54a2bc2fbe33c39f4d3d346))
