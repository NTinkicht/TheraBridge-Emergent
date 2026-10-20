# TheraBridge V1: Phase 1 Plan (Center Foundation), Conditionally Approved

> **Current authorization: TB-EM-000 (feasibility and portability gate) ONLY.** The build stops after TB-EM-000 for owner review. TB-EM-001 to TB-EM-006 need separate approval. Clinical pilot and production are NO-GO. Synthetic data only.

## TB-EM-000 scope (authorized now)
1. Start Next.js (port 3000) and NestJS on Fastify (port 8001, under `/api`) in the workspace.
2. Install PostgreSQL in the workspace and apply a first Prisma migration (a `FeasibilityProbe` table).
3. `POST /api/health/probe` writes a row and `GET /api/health/probe` reads rows back. A Next.js preview page calls both through the public preview URL and displays the persisted result. The page uses Direction B tokens and the BrandMark.
4. Commit `docker-compose.yml` (web, api, postgres), Dockerfiles, `.env.example`, lockfile, `RUN_LOCAL.md`, `EXIT_FROM_EMERGENT.md`, ADR-0001 (stack) and ADR-0004 (Postgres in workspace), plus a GitHub Actions CI workflow (install, migrate, test, compose build).
5. Executed tests: an API integration test against the real PostgreSQL, plus one preview check. Results go in `TEST_RESULTS.md` with real pass/fail. **Docker/Compose and CI are recorded as NOT RUN** until they actually execute in CI or another independent environment.
6. Prepare the handover pack (`CURRENT_STATE.md`, `WORK_LOG.md`, `NEXT_WORK.md`) for the first export to `emergent/phase-1-center-foundation`. The owner presses Save to GitHub and reports the SHA, and the SHA is then recorded.
7. **Stop condition:** if any of Next.js, NestJS/Fastify, PostgreSQL or Prisma cannot run reliably, the work stops and the blockers are reported. There is no fallback to FastAPI/MongoDB.

**TB-EM-000 deliverable report:** commit SHA (supplied by owner), technical results, limitations encountered and updated handover docs. Then STOP and wait for review. Work on TB-EM-001 or anything later does not start.

### Status labels (owner condition)
All docs and UI use exactly these labels:
- **IMPLEMENTED**: code exists and runs.
- **TESTED: PASS / FAIL**: executed this session, with the command and output recorded.
- **PLANNED**: not built.
- **NOT RUN**: a test exists or is planned but has not been executed.

Everything in this plan outside TB-EM-000 is **PLANNED**. Docker Compose and CI are **NOT RUN** until they execute in CI or another independent environment.

### Dev mailbox (owner condition)
- No mailbox endpoint is built in TB-EM-000. Reset and verification belong to TB-EM-001 (PLANNED).
- When it is built, the module is only registered when `NODE_ENV!=production`, `DEV_MAILBOX_ENABLED=true` **and** the request comes from localhost.
- The Emergent preview is publicly reachable, so it always runs with the mailbox disabled.
- Automated tests check that the endpoint returns 404 when the mailbox is disabled.

### Logo (received)
- Received: `TheraBridge Logo.jpg`. It contains the infinity/puzzle/circuit symbol, the "TheraBridge" wordmark and the line "AI-Powered Continuous Pediatric Therapy".
- The original JPG is kept byte-for-byte at `assets/brand/original/TheraBridge-Logo-original.jpg`.
- Derivatives:
  - Transparent-background PNG versions: the full lockup, the symbol only and the wordmark only, cropped from the original and not redrawn.
  - 1x and 2x sizes, and a favicon.
- Each derivative is checked side by side against the original before use. Any derivative that loses fidelity (fringing, clipped edges, color shift) is rejected and the issue recorded. No previous emblem is used.
- Note for the owner: the logo's tagline ("AI-Powered…") differs from the blueprint's tagline. The full lockup is preserved as supplied, and the UI tagline text stays "Coordinated care, meaningful progress." unless you say otherwise.

### GitHub export: safety check before export (owner condition)
- Emergent's documentation **does not guarantee** how "Save to GitHub" creates a new branch in an existing repo when this job was not imported from it. The branch may have unrelated history. A "Force Push" option exists on conflicts, and it overwrites the target branch.
- Pushing to a **new** branch cannot alter `main` or other branches unless Force Push is chosen on an existing branch.
- Procedure:
  1. After TB-EM-000 is complete, I **stop before export** and report.
  2. You then export with "Create new branch" = `emergent/phase-1-center-foundation`, and **never choose Force Push**.
  3. You verify on GitHub that `main` is unchanged.
- If the branch has unrelated history, integrate it outside Emergent through a reviewed PR (`git merge --allow-unrelated-histories`). This is documented in `EXIT_FROM_EMERGENT.md`.
- Generated files use namespaced paths so they do not collide with `AGENTS.md` or the blueprint.
- If you consider this insufficient, the alternative is a fresh Emergent job imported from the repo branch. That is a decision for you at the stop point.

TheraBridge is a multi-tenant workspace that connects pediatric therapy centers, their clinicians, coordinators, supervisors and families. It is a synthetic-data proof of concept and is **not authorized for clinical use**.
Phase 1 delivers the platform-operator side and the center side: sign-in, center applications, approval, direct provisioning, admin invitations, trial onboarding, audit records and tenant isolation.

---

## Who it's for

| Role | Phase 1 status |
|---|---|
| Platform Administrator | **Built**: reviews applications, approves or rejects them, provisions centers, manages trials, views audit records |
| Center Administrator | **Built**: accepts the invitation, completes onboarding, sees the center overview and trial usage, invites therapists (trial limit applies) |
| Center applicant (public) | **Built**: submits a center application and checks its status |
| Secretary / Coordinator | Planned. Phase 1 only reserves the role and denies all access |
| Therapist | Planned. Phase 1 covers invitation acceptance only, which lands on a "workspace arrives in a later phase" screen |
| Clinical Supervisor | Planned. Phase 1 only reserves the role and denies all access |
| Parent / Guardian | Planned. Phase 1 only reserves the role and denies all access |

---

## Stack decision and feasibility gate (approved choice: preferred stack)

| Technology | Supported here? | Notes |
|---|---|---|
| Next.js App Router + React + strict TypeScript + Tailwind | **Yes** | Runs as the frontend service on port 3000. Uses accessible primitives (Radix) and Lucide icons. |
| NestJS on Fastify (strict TS, modular) | **Yes** | Runs as the backend service on port 8001. Every route is under `/api`. All business logic lives here, and Next.js route handlers are not used for domain logic. |
| PostgreSQL + Prisma | **Partial** | PostgreSQL is installed and run inside the Emergent workspace container. It is not an Emergent-managed service. It may need reinstalling after a workspace fork or restore, and a documented script will handle this. Migrations are committed to the repo. |
| Docker Compose (web + api + postgres) | **Yes (authored and committed)** | Docker cannot run inside the Emergent container, so Compose cannot be executed here. It is verified by your cold-clone drill or by GitHub Actions CI. |
| Redis + BullMQ | **Deferred** | Phase 1 does not need it. The invitation and notification outbox is a PostgreSQL table. It will be added to Compose when async jobs are needed (Phase 2+). |
| S3-compatible storage | **Deferred** | Phase 1 has no uploads. MinIO will be added to Compose later. The logo ships as a static asset. |
| OIDC / SSO | **Prepared, not enabled** | The identity table separates credentials from users, so an OIDC provider can be added later without schema rework. |
| Emergent one-click deploy | **No** | Deploy only supports React/FastAPI/MongoDB, so the app runs in **preview only**. Hosting outside Emergent is the intended path anyway. |

**Step 1 of Phase 1 is a feasibility test, and the build stops here if it fails.**
The test is a minimal Next.js page that calls a NestJS `/api/health` endpoint. That endpoint reads and writes a PostgreSQL row through a Prisma migration, through the preview URL. Results are reported with real pass/fail evidence. If any part cannot run reliably, the build stops and the blockers are reported. There will be no fallback to FastAPI/MongoDB.

---

## Core features and experience (Phase 1)

### Authentication (portable, no Emergent auth)
- Email and password login. Passwords are hashed with **Argon2id**.
- **Server-side sessions** stored in PostgreSQL. The browser only holds an opaque random token in an HttpOnly, Secure, SameSite=Lax cookie. Sessions have an idle timeout of 30 minutes and an absolute limit of 12 hours.
- Logout revokes the current session. "Sign out everywhere" revokes all of a user's sessions. Admin suspension of a user or center revokes their sessions immediately.
- Rate limiting per IP and per account. After 5 failed attempts the account is locked for 15 minutes. Error messages are generic so they do not reveal whether an email exists.
- Password reset and email verification use single-use, expiring tokens. **Only a hash is stored**, and the raw token exists only in the message delivered to its recipient.
- **Delivery is split by message type (owner correction 2):**
  - **Center-admin invitations** appear in the platform admin's invitation outbox, which shows invitation messages only.
  - **Password-reset and email-verification messages are never visible to any administrator.** They go to an isolated **synthetic dev mailbox** adapter, which can be read only through a test-only endpoint (`/api/dev/mailbox/:address`).
  - That endpoint is compiled out or disabled unless `DEV_MAILBOX_ENABLED=true`, and it requires a separate `DEV_MAILBOX_KEY`. It is never exposed through admin APIs or screens.
  - It is replaced by a real email adapter later.
- Every state-changing request gets CSRF protection, using a double-submit token plus an Origin check.
- Users can belong to several centers and hold several roles. After login, users with more than one membership pick an organization and role. The active context is stored on the server-side session and re-checked on every request.
- Authorization is deny-by-default. Every API call checks the session, active membership, role and tenant. A request for another tenant's data returns "not found", so it leaks nothing.

### Platform Administrator workspace
Sidebar: Overview, Center applications, Centers, Plans & trials, Platform users, Operational events, Support, Settings.
- **Overview:** counts of active centers, pending applications, trial centers and expired trials, plus recent platform events.
- **Center applications:** a list filtered by status (pending, approved, rejected), and a detail page showing the applicant's data. Approve or reject requires a written rationale, saves the reviewer's name and time, and writes an immutable audit entry. The decision is protected against two admins deciding at once.
- **Approval provisions a tenant.** It creates the center (unique slug), starts the 30-day trial and issues an invitation to the center's first admin. The invitation link appears in the outbox.
- **Direct center creation:** a form for organization details, plan and owner admin identity, which produces the same tenant and invitation result.
- **Center detail:** status (trial, active, restricted or suspended), trial days left, usage (children 0/1, therapists x/3) and active users. Actions are suspend, reactivate, extend trial and resend or revoke invitation. No clinical data is shown anywhere.
- **Plans & trials:** a view of the default trial plan settings (30 days, 1 child, 3 therapists). These can be changed per center with audit.
- **Invitation outbox:** center-admin invitation messages only, with recipient, status and a copyable invitation link. It stands in for email. Reset and verification messages are excluded by design.
- **Operational events:** an audit log that can be filtered by actor, action, center and date. It shows metadata only.
- **Platform users / Support / Settings:** Platform users is a read-only list in Phase 1. Support and Settings are shown as **"Available in a later phase"** with that reason, not as fake working links.

### Public center application
- A minimal sign-in landing page with a link to "Apply for your center".
- The application form asks for the center name, country/city, specialties offered, contact admin's name and email, and expected staff size. A required checkbox confirms the applicant uses only synthetic data.
- **Tracking (owner correction 3):** submitting shows a confirmation with a one-time, **high-entropy tracking link** (a 256-bit random token, stored hashed). The status page only accepts this token.
  - It shows only a coarse status: "Received / Under review / Decision made, check the invitation email."
  - It **never shows the rejection rationale or applicant details.**
  - Rationales are visible only to platform admins. A rejected applicant is told only that the application was not approved, and given a contact route.
  - The status page is rate limited, and an invalid token gets a generic "Link not valid" response.
- Duplicate pending applications for the same email are blocked.

### Center Administrator workspace
Sidebar: Overview, Children, Invitations, Calendar, Packages, Replacements, Billing, Settings.
- **Invitation acceptance:** the admin sets a name and password, which activates the account and signs them in.
- **First-run onboarding:** confirm center profile, timezone and operating hours, then see the trial terms.
- **Overview:** trial banner (days left, limits), onboarding checklist, staff and invitation counts, and "Upcoming sessions: available in Phase 2".
- **Invitations:** invite therapists. The backend enforces the **limit of 3 therapists**, counting active therapist memberships plus pending (unexpired, unrevoked) invitations.
  - The check runs in a serializable transaction that also locks the center's trial row, so two invitations sent at once can't exceed the limit.
  - This is tested with parallel requests.
  - Invitations can be resent, revoked or left to expire.
- **Packages:** current trial plan, usage meters and days remaining. The upgrade path is shown as unavailable with an explanation, since no billing is set up.
- **Settings:** center profile, contact details, timezone and operating hours.
- **Trial expiry:** the center enters a **restricted** state. Data is kept, the center becomes read-only, a clear message is shown, and there is a "Contact platform to convert" route. Expiry is checked on every request, and an hourly scheduled job also marks centers as expired.
- Children, Calendar, Replacements and Billing appear in navigation marked **"Phase 2"**, each with an honest empty state.
- **The 1-child limit is PLANNED, not implemented (owner correction 4).** The limit value is stored on the trial plan, but it is not reported as enforced or tested until child registration exists in Phase 2. The usage meter labels it "Planned".

### Shared states on every screen
Loading skeleton, empty, validation errors, access denied, session expired, conflict ("someone else updated this — reload"), trial restricted, offline/retry. A "saved" or "approved" message appears only after the server confirms the change.

---

## User flow (Journey 1: center onboarding)

1. Applicant submits a center application → sees "Application pending" and a reference code.
2. Platform admin sees it under Pending → opens it → approves (or rejects) with a rationale. An audit entry is written.
3. On approval, the system creates the tenant, starts a 30-day trial and puts an admin invitation in the outbox.
4. Platform admin copies the invitation link from the outbox and gives it to the applicant (this simulates email).
5. Center admin opens the link → sets a password → completes onboarding → lands on the center overview with the trial banner.
6. Center admin invites up to 3 therapists. A 4th invitation is refused with "Trial limit reached".
7. Alternative path: platform admin creates a center directly, skipping the application, and the flow continues from step 3.
8. Trial expires → the center becomes restricted, its data is kept, and platform admin can extend or convert it.

Denial paths that are tested: wrong tenant, suspended center, revoked invitation, expired invitation, expired session, duplicate application, a decision on an already-decided application, exceeded limit, expired trial, and login lockout.

---

## UI/UX feel: TheraBridge Direction B (exact values preserved)

- **Colors:** every hex from the blueprint (§2.1–2.3) is one central token set, shared by Tailwind and CSS variables. The clinician/admin canvas is `#F6F7F9`, primary actions are `#0F5692` (hover `#0B4577`), text is `#14213D` and muted text is `#4B566B`. Violet `#7A4AB7` is used only as a brand accent and never for selection. The family light and dark palettes are defined now but only used in a later phase.
- **Signature band:** a 3px band in `#052464 · #0F5692 · #0DA8B8 · #7A4AB7` across the top of the sidebar or header and on brand panels.
- **Type:** IBM Plex Sans throughout, with IBM Plex Serif reserved for documents later. Page titles are 31px/600 on desktop and 24–26px on mobile, section titles 20px, card titles 17–18px, body text 15–16px and labels 13–14px.
- **Shape and spacing:** an 8px grid, 12–16px radius on cards, 10–12px on controls, pill status badges, 48–54px inputs, buttons at least 44px tall, and borders preferred over shadows.
- **Navigation:** the selected item has a tinted `#E8F0F8` background, a 3–4px blue left indicator and a blue icon and label. This is identical on every item.
- **Shell:** a 254px sidebar at 1440px with content capped at about 1100–1160px. At 1024px the sidebar becomes a collapsible rail. At 768px it becomes a drawer. At 390px and 320px the layout is a single column with 16px padding, a top bar and a bottom navigation of 4–5 items plus "More". Tables turn into cards on mobile.
- **Login:** at desktop width, a split screen with a roughly 625px brand panel and a centered form roughly 550px wide titled "Welcome back". On mobile it stacks, with a compact brand strip.
- **Logo (owner correction 1):** the new TheraBridge logo (infinity/puzzle/circuit symbol plus wordmark) replaces any earlier emblem or placeholder.
  - The **original file is saved unchanged** under `assets/brand/`. It is never regenerated or redrawn.
  - Web derivatives are made only after their visual fidelity has been checked side by side with the original: a transparent-background PNG, plus 2x and 1x sizes for the sidebar, login and favicon.
  - All of them are used through the replaceable `BrandMark` component.
  - **Status: received (`TheraBridge Logo.jpg`).** See "Logo (received)" above.
- **Accessibility:** the target is WCAG 2.2 AA. That means visible focus, keyboard navigation, labeled fields, status that never relies on color alone, and respect for reduced-motion settings.

---

## Data model (Phase 1 tables, PostgreSQL)

User, AuthIdentity (password or a future OIDC provider), Session, LoginAttempt, VerificationToken (reset and email verification), Center (tenant), Membership (user ↔ center), RoleAssignment (membership ↔ role), CenterApplication, ApplicationDecision (immutable), CenterPlan, TrialSubscription, Invitation, NotificationOutbox, AuditEvent (append-only), IdempotencyRecord.
Every tenant-owned row carries `centerId`, which is enforced by foreign keys and checked in every query. Decisions, audit events and invitations are separate lifecycle records rather than a single status field. Logs and audit entries never contain passwords, tokens or personal free text.

---

## Permission matrix (Phase 1)

| Action | Platform admin | Center admin | Therapist (invited) | Others |
|---|---|---|---|---|
| Review, approve or reject applications | Allow | Deny | Deny | Deny |
| Create, suspend or extend a center | Allow | Deny | Deny | Deny |
| View center operational detail | Allow (any center) | Allow (own center) | Deny | Deny |
| Edit center profile and settings | Deny | Allow (own, not when restricted) | Deny | Deny |
| Invite or revoke therapists | Deny | Allow (own, within limit) | Deny | Deny |
| View invitation outbox | Allow (invitations only) | Own center's invitations only | Deny | Deny |
| View reset/verification messages | **Deny** | **Deny** | **Deny** | Test-only dev mailbox, never on admin endpoints |
| View audit log | Allow (metadata) | Own center (metadata) | Deny | Deny |
| Any clinical data, signing, release, recording, safeguarding | **DENY** | **DENY** | **DENY** | **DENY** (pending clinical policy) |

The full six-role matrix will be committed as `docs/security/PERMISSIONS.md`, with every unresolved clinical permission marked DENY.

---

## GitHub and continuity strategy

- **Repository:** `NTinkicht/TheraBridge-Emergent`, **branch `emergent/phase-1-center-foundation`**. `main` and the existing docs and history are never overwritten.
- **Saving:** you press **Save to GitHub** and pick that branch after each work unit, then share the commit SHA, which is recorded in `CURRENT_STATE.md`. The SHA cannot be pushed or verified from inside Emergent. Each new work unit begins only after the previous one has been exported, or is otherwise marked `UNEXPORTED / AT RISK`.
- **Existing files:** the repository cannot be pulled into this running job, so existing files such as `AGENTS.md` and the master blueprint are not available here. To avoid colliding with them, all generated content is placed under `apps/`, `packages/`, `docs/emergent/…` and `scripts/`. The repository's root `README.md` is not touched; a separate `README.emergent.md` is added instead. **Before merging, review the diff on GitHub for any file collision.**
- **Living handover pack (committed every work unit):**
  - `README.emergent.md`
  - `docs/emergent/handover/CURRENT_STATE.md`
  - `docs/emergent/handover/WORK_LOG.md`
  - `docs/emergent/handover/NEXT_WORK.md`
  - `docs/emergent/architecture/ARCHITECTURE.md`
  - `docs/emergent/architecture/decisions/ADR-0001-stack.md`, `ADR-0002-sessions-auth.md`, `ADR-0003-outbox-instead-of-email.md`, `ADR-0004-postgres-in-workspace.md`
  - `docs/emergent/security/PERMISSIONS.md`
  - `docs/emergent/security/AUTH_FLOWS.md`
  - `docs/emergent/traceability/WORKFLOW_COVERAGE.csv`
  - `docs/emergent/api/openapi.yaml` (generated from NestJS)
  - `docs/emergent/data/DATA_MODEL.md`
  - `docs/emergent/operations/RUN_LOCAL.md`
  - `docs/emergent/operations/EXIT_FROM_EMERGENT.md`
  - `docs/emergent/qa/TEST_RESULTS.md`
  - `.env.example`
  - `docker-compose.yml`
  - `scripts/seed-synthetic.ts`
  - lockfile
  - `.github/workflows/ci.yml`
- **Work units in Phase 1:**
  - TB-EM-000 feasibility test
  - TB-EM-001 auth and sessions
  - TB-EM-002 public application
  - TB-EM-003 platform review and provisioning
  - TB-EM-004 invitations, outbox and center onboarding
  - TB-EM-005 trial limits and expiry
  - TB-EM-006 responsive and accessibility pass with handover
- **Cold-clone drill (documented, run by you or by CI):** clone the SHA, then run `docker compose up`, migrate, seed and test. Then log in as the synthetic platform admin and center admin, complete Journey 1, confirm that cross-tenant requests are rejected, and open a trivial PR. The repo's CI runs the same steps on every push, so each SHA gets independent pass/fail evidence.
- **Test evidence:** each checkpoint includes API and permission tests (Jest + Supertest against a real PostgreSQL), browser smoke tests, and screenshots at 320, 390, 768, 1024 and 1440px. Tests not run are listed as "not run" and are never counted as passing.

---

## Implementation phases

**Phase 1: Center foundation**
**TB-EM-000 feasibility gate is authorized now. Everything after it waits for owner review.** Then the work units TB-EM-001 to 006 above: auth, the public application, platform review and provisioning, direct creation, invitations and outbox, center admin onboarding and overview, the trial limits of 30 days, 1 child and 3 therapists, expiry to restricted state, audit, denial tests, the responsive shell and the full handover pack.

**Phase 2: Care operations and clinical drafts**
Child and guardian administrative onboarding, staff specialties and caseload assignments, the coordinator scheduler and calendars, the multi-specialty therapist workspace, the session workflow with resilient note drafts, and goals, progress observations and plan/report drafts with source review and exact-version previews. Approval, signing and release stay disabled. Redis/BullMQ and MinIO are added here.

**Phase 3: Family workspace and governance**
The guardian portal (released content only), activities and outcomes, progress, full family dark mode, home-plan requests, revocation and transfer handling, supervisor review queues under your approved policy, scoped messaging, the notifications outbox processor and a security and accessibility review. Clinical pilot and production remain **NO-GO**.

---

## Risk register (top items)

| Risk | Impact | Mitigation |
|---|---|---|
| PostgreSQL inside the workspace may not survive a fork or restore | Workspace data lost | Data is synthetic only, a re-provision script is provided, and seeding is deterministic |
| Docker cannot run inside Emergent | Compose is unverified here | GitHub Actions CI and your cold-clone drill provide verification |
| No Emergent deploy for this stack | No hosted URL beyond the preview | Host independently later, as `EXIT_FROM_EMERGENT.md` describes |
| Existing repo files are unseen | Possible file collisions | Generated files go under a namespaced `docs/emergent/` path and you review the diff before merging |
| Save to GitHub runs only when you press it | Gap between workspace work and the export | One export per work unit, recorded in `CURRENT_STATE.md` |
| The full six-role permission matrix is not approved | Clinical actions blocked | Deny-by-default, which is intended |

---

## Assumptions (decided without asking)

- Phase 1 builds the Platform Admin and Center Admin workspaces plus the public application. The other four roles are modeled but denied.
- Invited therapists can accept an invitation and sign in, but they see a "workspace arrives in Phase 2" screen.
- Sessions have a 30-minute idle timeout and a 12-hour absolute limit. Lockout is 5 failed attempts for 15 minutes. Reset tokens are valid for 1 hour and invitations for 7 days.
- Pending invitations count toward the 3-therapist limit (enforced transactionally).
- Trial expiry makes the center read-only. Nothing is deleted.
- New center accounts must verify their email (through the outbox link) before full access. Invitation acceptance counts as verification.
- Plan or package changes and billing are display-only in Phase 1, since no payment provider is set up.
- Synthetic seed data: Harbor Child Development Center (active trial), a second isolated center for leak tests, an expired-trial center, one pending applicant, a platform admin and two center admins. Clinician and family records are seeded in later phases.
- Synthetic login credentials are recorded only in an internal test-credentials file and `.env.example` notes, and never on a public page.
- Dates and times are stored in UTC and shown in each center's timezone.
- English-only UI in Phase 1.
- The logo will be processed (white background removed, saved as a PNG) once you upload it. Until then, a placeholder BrandMark is shown.
