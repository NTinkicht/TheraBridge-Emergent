# TB-EM-015 — Therapist session execution and synthetic dictation

Repository: NTinkicht/TheraBridge-Emergent. Base: latest fetched main, exactly `f49ade4125cdb26e11fd7eb2cc80c292a48f00a9` (merged PR #57). Issue: #58. Feature branch: `freebuff/tb-em-015-session-workflow`. Primary developer: Freebuff. Independent reviewer: Mistral (not self-approved).

## Audit / implementation-gap table

| Area | Existing baseline reused | Gap implemented |
|---|---|---|
| Therapist dashboard/navigation | Role shell, assigned children, schedule and clinical child workspace | Appointment detail links to existing child session workspace |
| Scheduling | Assigned appointments, status, room, times, tenancy and trial gates | Start scheduled visit, reject future/canceled/no-show visits, display planned details |
| Child/specialty | Active care assignments, multi-specialty memberships | Explicit ad-hoc specialty selector; server rechecks assignment and membership specialty |
| Clinical notes | SessionNote, sections, author/version, unsigned DRAFT constraint | Separate operational execution status, actual start/end, attendance review, completion/read-only |
| Activity library | Existing ActivityTemplate with version/materials/steps/safety/estimate | Search/specialty selection, multiple activities, reorder/remove/replace, persisted content snapshots |
| Activity evidence | Existing plan versions and separate Observation records | Exact planVersionId + goalKey and goal snapshot; objective, minutes, independent outcome/assistance, factual observation, author/time/order/source |
| Drafts/concurrency | ClinicalService.write, center/actor/child/assignment locks, audit | Autosave with authoritative confirmation, resume, optimistic versions, start/retry keys, error recovery |
| Speech-to-text | No approved audio pipeline | Replaceable capture/transcription interfaces, labelled synthetic fixture processor, correction, explicit insertion, cancellation and test error scenarios |
| Design | Direction B, IBM Plex Sans, shared design UI, Field/SelectField, responsive shell | Reused without new dependencies or design system; no unrelated redesign |
| Figma | Canonical URL inspected | Readable response exposes only Figma shell; individual frame verification unavailable; existing implementation remains authority |

## API/data contracts

- `POST /api/centers/:centerId/clinical/children/:childId/sessions`: existing service/date/optional appointment plus UUID `startKey`, ISO `actualStart`. Returns `{id}`. Authorized same-key/same-appointment start returns original ID. Cross-scope key reuse conflicts.
- `PATCH /api/centers/:centerId/clinical/sessions/:id`: integer `version`, UUID `mutationKey`, existing `sections`, ordered `activities`, ISO actual times, attendance `PRESENT|NO_SHOW`, execution `IN_PROGRESS|COMPLETED`. Returns authoritative `{version,updatedAt}`. Exact last mutation retries replay only after current authorization; changed payload/key or stale version conflicts. No success before response.
- Activities: stable UUID, library ID, integer minutes 0–480, objective, optional exact plan-version + goal-key, completion `NOT_STARTED|COMPLETED|SKIPPED`, optional outcome `ACHIEVED|PARTIAL|NOT_ACHIEVED`, independent assistance `INDEPENDENT|SOME_ASSISTANCE|SUBSTANTIAL_ASSISTANCE`, observation. Performed entries require objective/outcome/assistance. Max 30 activities. Server assigns snapshot, source/version, author, creation/update timestamps, position, `UNVALIDATED_SESSION_ACTIVITY` semantics. Clients cannot supply snapshots or authors.
- Existing child workspace GET adds execution fields and ordered activity evidence; no new read authorization or parent exposure. Existing note PATCH cannot change completed notes. Existing note creation rejects non-scheduled appointment association.
- Migration `20261101090000_tb_em_015_session_execution` is additive to SessionNote; no parallel session model. Existing notes retain content, author/version, and unsigned clinical DRAFT status. New operational defaults are IN_PROGRESS, PRESENT, empty activities and null actual times. Actual start must be entered for legacy note execution. Unique nullable start key, lifecycle/attendance/timing/JSON checks, completed-row UPDATE/DELETE trigger. Existing signing DENY remains.
- No queue/jobs, Redis, new provider service, package dependency or customer secret. No billing/package reconciliation. Completion does not change appointment attendance automatically; attendance is explicitly reviewed on the session. Financial and scheduling reconciliation are separate.

## Authorization and locking

Writes reuse ClinicalService.write: center lock/trial check → active actor/membership/roles → child/assignment SHARE locks → live specialty assignment → session version/write/audit in one PostgreSQL transaction. Session execution also checks membership specialties and author ownership. Center serialization orders appointment cancellation and session start/save. Unauthorized retries never bypass assignment checks. Read queries retain current tenant/service filtering. All existing CSRF, route access verification and PR #57 messaging tests remain enabled; clinical supervisors gain no discussion access. No grants, signatures, releases, safeguarding media, production or pilot activation.

Activity snapshots survive library changes. Goal references preserve version/key and exact goal semantics, not an unscoped name. Session evidence creates no Observation or approved clinical progress. Later report/home-plan generators can reference session ID/version, activity identity, snapshot and goal version; they must still require separate therapist validation and guardian-specific release.

## Dictation mode and activation requirements

**This is not genuine speech recognition.** The microphone-labelled control explicitly runs a synthetic text fixture. No microphone API is invoked, no audio is recorded, stored, retained, uploaded or sent to browser-vendor Web Speech/AI services. A `CaptureProvider` interface and separately replaceable `TranscriptionProvider` keep capture/processing distinct from editable review and note persistence. Real capture implementation always rejects with the governance reason. Only explicit reviewed insertion enters normal note autosave; transcript text itself is not sent to the API or persisted in browser storage.

Synthetic scenarios cover success, permission denied, unavailable microphone, unsupported capture, interruption, empty output, provider error and network error. These are accurately labelled simulations, not claims of real device/provider testing. Cancel aborts synthetic processing and preserves edited text. Discard requires confirmation. Navigation/tab/unload warnings guard unsaved transcript/session content. Revoked-assignment save errors preserve text on screen without redirecting or falsely confirming success.

Browser support: synthetic mode uses standard React/textarea/Promise/AbortController in current desktop/mobile browsers; automated verification used Chromium 130 (Playwright 1.48.2). Safari/Firefox/device microphone behavior is NOT verified. Recognition accuracy cannot be measured for a fixed text fixture. There are no external STT dependencies or per-minute charges in this mode; ordinary application hosting costs remain.

Before real activation: signed processing/consent/retention decisions; approved provider and data location/subprocessor contract; authorized patient-audio processing purpose; browser/device support and permissions review; server-side provider credentials, access/rate limits, deletion/retention controls; interruption/network retry and real accuracy validation using approved non-identifiable material; explicit policy release. No flag in this patch activates real recording.

## Executed verification

Environment: Node 20.19.0 / Yarn 1.22.22, lockfile unchanged; private workspace PostgreSQL 16 cluster on port 55432; synthetic-only databases `tb015_test`, `tb015_upgrade`, `tb015_preview`. Restored dependencies installed with `yarn install --frozen-lockfile` (PASS). Locally restored browser shared libraries and FONTCONFIG_FILE were necessary; an initial Chromium font-cache crash was diagnosed and resolved, not reported as a test pass.

Commands (run from root unless specified; local tooling PATH prepended):

```bash
yarn install --frozen-lockfile
yarn workspace @therabridge/api prisma generate
DATABASE_URL=postgresql://tb015@127.0.0.1:55432/tb015_test yarn workspace @therabridge/api prisma migrate deploy
yarn workspace @therabridge/api typecheck
DATABASE_URL=postgresql://tb015@127.0.0.1:55432/tb015_test yarn workspace @therabridge/api test
yarn workspace @therabridge/api build
yarn workspace @therabridge/web typecheck
NEXT_PUBLIC_API_BASE_URL=<current-preview-origin> yarn workspace @therabridge/web build
node scripts/design/check-session-workflow.mjs
node scripts/design/check-session-live.mjs
docker compose --env-file .env.example build
```

| Check | Actual result |
|---|---|
| API typecheck | PASS |
| Full API suite, real PostgreSQL | PASS **453/453**, **12/12 suites** (158.218 seconds final full run) |
| New lifecycle suite | PASS **4/4**, including scheduled/ad-hoc, snapshot stability, reorder/remove, result/assistance, duplicate/retry, dual-specialty/revoked assignment, ownership, tenant denial, trial, canceled appointment, optimistic concurrent updates and completion/legacy-edit denial |
| Existing privacy/security/governance suites | PASS as part of full suite; no supervisor discussion access regression |
| API Nest production build | PASS |
| Web typecheck and Next production build | PASS |
| Responsive browser fixture test | PASS at 320/390/768/1024/1440; no horizontal document overflow, role nav, accessible labels, keyboard activity insertion, synthetic error/cancel/retry, editable correction, unsaved tab guard, delayed authoritative save, revoked save preservation, completed read-only |
| Real browser + API + PostgreSQL journey | PASS: real login → assigned child → ad-hoc start → library activity → separate outcome/assistance → synthetic transcript correction/insertion → autosave → reload/resume → complete → reload read-only; no mocked API responses |
| Fresh migration chain | PASS all 16 migrations |
| Baseline-to-current upgrade | PASS: baseline chain applied to separate DB, inserted legacy synthetic note, current migration applied; original content retained with IN_PROGRESS/DRAFT/0 activities |
| Docker Compose | BLOCKED: Docker socket permission denied; build/up/smoke not passed |
| Figma frame validation | NOT AVAILABLE: page extraction returned only Figma shell |
| Secret scans | Recorded in artifacts/tb-em-015/VALIDATION.md after final scoped export scan |
| GitHub exact-head CI / draft PR / Mistral | Requires authenticated PR API; local gh has no login. Do not infer CI or review from local tests. Final delivery report records actual outcome. |

The first full run caught the route inventory needing both explicit new routes (452 pass / 1 fail); only those exact reviewed endpoints were added, preserving the assertion. Final full suite above passed. UI labels and repeat-run test identity were repaired and affected DOM/live checks rerun successfully.

## Remaining limitations / independent review focus

- Real STT/audio capture remains policy-blocked and disabled; synthetic mode satisfies only the permitted safe path.
- No load/failover/recognition accuracy testing; center-wide write serialization may limit throughput. Ordered activity evidence is bounded JSONB within the existing note, suitable for this milestone but not an analytics warehouse.
- Idempotency is last-write replay with optimistic versioning, not an unlimited mutation ledger. After another accepted write, stale retries conflict. Start keys are per mounted start flow; unknown-result page reload recovery should use the resumed server record rather than assume a fresh start request is the same operation.
- Read workspace returns the latest 50 notes (existing bound), and displays recent appointment window (existing behavior). Long-term paginated historical discovery is not expanded in this milestone.
- Navigation warning is browser/client protection, not durable offline storage; device crash can lose unconfirmed text. No identifiable clinical text is copied to localStorage. Read-only display uses current workspace authorization; already delivered responses cannot be retracted.
- Browser fixture tests do not prove server authorization; PostgreSQL tests do. Real journey covers ad-hoc flow; scheduled start is exercised via real API integration. Safari/Firefox, interactive Figma comparison and device microphone tests remain pending.
- No AI reports/approval/signing, home-plan approval/release, chart aggregation, consent grants, real patient processing, package charges, deployment, self-approval or automatic merge.
