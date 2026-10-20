# TheraBridge V1 — Self-Contained Product, Design & Implementation Blueprint

**Purpose:** A complete, independent specification for an AI application builder. Do not require access to Figma, GitHub, external specification files, screenshots, or a previous codebase. This document describes the product and visual system to build. It is not an authorization for live clinical use.

**First instruction to the builder:** Read this entire document, produce a feasibility/architecture assessment and phased implementation plan, and identify gaps before writing code. Build a genuine, persistent, multi-tenant application, not a marketing website, a screenshot imitation or an interactive storyboard. Do not attempt to build every feature in one pass. Begin with Phase 1 only when approved.

## 1. Product definition and experience

**Product name:** TheraBridge (always use TheraBridge in new UI; do not display historical product names).

**Tagline:** Coordinated care, meaningful progress.

**Product:** A web-based, responsive, multi-tenant SaaS workspace connecting pediatric therapy centers, their multidisciplinary clinicians, operational coordinators, clinical supervisors and the child's family. Initial specializations include speech and language therapy, occupational therapy (OT), physiotherapy, applied behavior analysis (ABA), and group therapy. A single clinician may hold more than one specialization.

**Visual/UX personality:** Calm, trustworthy, precise, contemporary, warm but not childish. Clear task hierarchy; generous negative space; smooth, restrained interactions; legible typography; no crowded metrics, gratuitous illustrations or overly bright gradients. Clinical workflows should feel professional and dependable. Family workflows should feel welcoming, understandable and practical.

**Safety boundary:** All development, previews and tests use invented synthetic data only. No real patient, child, family, health, audio, image, school, consent or therapy records. Clinical signing, approval, protected release, recording, safeguarding escalation and sensitive sharing remain disabled by default until formal policies and authorization criteria are reviewed and approved. This is a synthetic demonstration, not a clinical system or approved deployment.

## 2. Official visual design system (Direction B)

The following core colors and fonts come from the approved design identity, not artistic approximations. Preserve these exact values. Any additional colors must be harmonized with them and centrally tokenized.

### 2.1 Core brand colors

| Token | Hex | Usage |
|---|---|---|
| `brand.deepNavy` | `#052464` | Emblem color / strong brand anchor |
| `brand.action` | `#0F5692` | Primary CTAs, links, clinician-selected navigation |
| `brand.cyan` | `#0DA8B8` | Brand band, supporting care accent |
| `brand.violet` | `#7A4AB7` | Reserved brand-identity highlight; NOT default selection color |
| `brand.ink` | `#14213D` | Main text/headings |
| `brand.familyTeal` | `#0A7385` | Parent-facing active navigation and CTAs |
| `brand.inkMuted` | `#4B566B` | Secondary text |
| `brand.actionHover` | `#0B4577` | Primary-button hover |
| `brand.actionTint` | `#E8F0F8` | Soft clinician action background |
| `brand.familyTint` | `#E3F3F5` | Soft family accent background |

### 2.2 Light surfaces and semantic states

| Token | Hex |
|---|---|
| `canvas.clinical` | `#F6F7F9` |
| `canvas.family` | `#FAF8F5` |
| `surface.white` | `#FFFFFF` |
| `surface.subtle` | `#F3F6F9` |
| `border.light` | `#E4EAF3` |
| `border.strong` | `#AABDD1` |
| `status.success` | `#146A50` |
| `status.caution` | `#945900` |
| `status.danger` | `#AA343F` |
| `status.cautionSurface` | `#FFF3DC` |
| `status.dangerSurface` | `#FDECEA` |
| `parent.heading` | `#14213D` |
| `parent.bodyStrong` | `#1A3354` |
| `parent.muted` | `#5C6E8A` |
| `parent.tile` | `#EDF2FA` |
| `parent.instructionTile` | `#F0F5FB` |
| `parent.link` | `#1F668A` |

### 2.3 Family dark mode (official palette)

| Token | Hex |
|---|---|
| `dark.canvas` | `#0D1226` |
| `dark.surface` | `#151B33` |
| `dark.raised` | `#1C2342` |
| `dark.border` | `#2A3256` |
| `dark.ink` | `#E9ECF5` |
| `dark.inkMuted` | `#AAB3CB` |
| `dark.action` | `#7DB3E8` |
| `dark.family` | `#5CCFDB` |
| `dark.familySurface` | `#13394A` |
| `dark.parentTile` | `#263346` |
| `dark.parentInstructionTile` | `#243241` |

Dark mode is intentionally offered to families as a full, coherent theme. Do not mix light and dark surfaces or navigate accidentally to a light version of the same page. Persist user preference.

### 2.4 Four-color signature band and logo handling

Add a restrained **3px horizontal signature band** on the brand/navigation header or brand-bearing panels using four adjacent colors in order: `#052464`, `#0F5692`, `#0DA8B8`, `#7A4AB7`. Avoid giant decorative gradients.

Use the product **wordmark “TheraBridge”** in IBM Plex Sans Semibold and the actual approved Direction B raster emblem supplied in this repository at `assets/brand/therabridge-official-emblem.png` (exact image bytes extracted from Figma canonical emblem component `153:329`, source size **112×63 pixels**). Render the image proportionally without stretching, cropping, recoloring or regenerating it. Keep `BrandMark` centralized and replaceable, with accessible text alternatives. The original approved vector asset is still desirable before production and for large-scale rendering; do not manufacture a fake vector version.

### 2.5 Type, iconography, spacing, shape

- UI font: **IBM Plex Sans**. Document/report typography may selectively use **IBM Plex Serif** for well-defined document sections; avoid mixing serif and sans randomly.
- Recommended type ramp for the implementation: desktop page title 30–32px/600 (original designs use approximately 31px), section title 20px/600, card title 17–18px/600, body 15–16px/400, labels 13–14px/500, metadata 12–13px. Mobile page title 24–26px. Use responsive, fluid behavior rather than fixed-height text boxes.
- Use an 8px-based spacing system with 4px sub-steps; typical component gaps 8, 12, 16, 24 and 32px. Do not compress interfaces to force entire flows above the fold.
- Radius: 12–16px cards, 10–12px controls, pills for small status indicators. Subtle shadows only on raised surfaces; rely more on surface contrast and borders.
- Controls: 48–54px input rows where feasible, buttons with minimum 44px hit height; mobile tap targets >=44px.
- Iconography: simple consistent thin-stroke symbols, e.g. Lucide. Icons support text, do not replace core labels.
- Accessibility: WCAG 2.2 AA target; keyboard navigation, visible focus, semantic headings, correct labels/errors, sufficient contrast, non-color status cues, no unreadably small type, reduced-motion preference.

## 3. Global responsive application shell

Create one coherent component library and shared shell so the six workspaces look like the same product, not separately generated apps.

**1440px desktop reference:** Left navigation sidebar **254px** wide. Main page starts around x=301px (47px after sidebar), with generous space for title, subtitle, user/access menu, data cards and action areas. Core content typically spans ~1056px but may shrink within the viewport; keep max-width around 1100–1160px rather than hardcoded absolute coordinates. Reference canvas height 900px is an example, not a fixed page height. Sidebar brand at top, clear navigation in center, account/help at bottom. Page heading ~31px with one-line context underneath.

**1024px compact desktop:** Collapsible sidebar, content starts after a smaller rail or expanded navigation. Grids change from 3 to 2 columns as space requires. No horizontal clipping.

**768px tablet:** Sidebar becomes drawer or slim rail; most content becomes 1–2 columns. Maintain the original workflow actions, labels, and data, not a drastically simplified or contradictory alternate application.

**390px and 320px mobile:** Single column, compact 16px side padding; mobile header with page name and account access; appropriate bottom navigation for up to 4–5 primary destinations plus “More” or a drawer for secondary destinations. Avoid sticky controls obscuring content and use real scrolling. Don’t shrink desktop tables; turn them into accessible cards with sorting/filter controls.

**Navigation rule:** A navigation item is indicated as selected using the same pattern in all sections: tinted background + 3–4px left active indicator (desktop) or filled/tinted tab background (mobile) + active icon/text; clinician active style uses blue and family active style uses teal. Do not show a purple selection square only for the Home tab or use different selected states on Plan/Progress/Activities. Violet is a brand accent, not the principal navigation-state color.

**Reusable system components:** `AppShell`, `Sidebar`, `MobileNavigation`, `TopBar`, `RoleSwitcher`, `CenterSwitcher`, `SpecialtySwitcher`, `ChildContextHeader`, `PageHeader`, `PrimaryButton`, `SecondaryButton`, `DangerAction`, `StatusPill`, `MetricCard`, `AppointmentCard`, `ChildCard`, `ActivityCard`, `PlanCard`, `ProgressCard`, `EmptyState`, `InlineError`, `AccessDenied`, `AuditTimeline`, `ConfirmationDialog`, `AutosaveIndicator`, `DataTable`, `AccessibleFormField`, `LoadingSkeleton`, `NotificationCenter`, `BrandMark`, `ThemeToggle`.

Every primary control must work or be explicitly marked unavailable with a meaningful reason. No placeholder links pretending to work. Include loading, empty, validation, permission-denied, revoked-access, conflict, expired-session, offline and retry states where relevant. No fabricated saved/approved/released receipts.

## 4. Identity, tenants, users and authorization

The software supports one platform operator managing multiple separate therapy centers. Every center is a tenant. Each user can have multiple tenant memberships, job responsibilities, and authorized scopes. A therapist can have multiple specialty assignments and a parent/guardian can have approved relationships to one or more children.

For each server operation, evaluate: authenticated identity; active tenant membership and role; active child/caseload assignment or guardian relationship; action-specific consent/grant; resource/version state; and any explicit signing/release authority. Do not grant clinical privileges merely because an account is an administrator. Inactive/revoked membership or grant must take effect immediately on protected reads and writes.

**Roles / capabilities: use these as functional product descriptions, NOT as pre-approved clinical authorization rules.**

1. **Platform Administrator:** review center applications; create, approve, suspend, and manage centers; configure packages/trials; oversee operational metrics, support, platform configurations and audit metadata. No general clinical-note, report or child-therapy access.
2. **Center Administrator:** manage center profile; staff invitations and assignments; registered children and guardians' administrative identities; scheduling; packages and subscription status; operating metrics; transfers and staff replacement requests; tenant settings. No automatic clinical-content access.
3. **Secretary / Coordinator:** manage appointment requests, calendars, practitioner availability, attendance and operational messages. Limited to administrative scheduling data and contact information as authorized; no automatic clinical reports or notes.
4. **Therapist:** see only assigned children and permitted clinical context; own calendar; deliver sessions in assigned specialties; manage observations, goals, evidence, session notes, plan drafts, progress data, report drafts and permissible family communications. May hold Speech + OT, etc.; task context must make active specialty explicit.
5. **Clinical Supervisor / Referent:** see only explicitly assigned supervision scope and permitted review queues; review work and supervise outcomes as policies allow. The power to sign, co-sign, approve or release is separately granted and remains disabled until approved rules are supplied.
6. **Parent / Guardian:** access only a child with an active named guardian grant and only the exact report/plan versions released for that recipient and purpose; see accessible appointments, home activities and permitted progress; submit fixed-choice family activity outcomes; raise a request or communicate through enabled channels. No access to clinician-only drafts, assignments or other families.

Additional scoped functions such as scheduler, signing clinician and safeguarding lead may be modeled as **capabilities/appointments**, not assumed universal powers. Approval of the exact role-to-operation matrix is pending. Default-deny protected operations when that approval is needed.

## 5. Complete application modules and principal routes

Design the following modules as part of one unified product. Every route must have a real role-scoped controller/API plan and a data-state plan.

### A. Public entry, identity and onboarding

- Product landing/sign-in (minimal, credible, not a marketing mega-site)
- Login, password recovery, invitation acceptance, account activation
- Organization selection and account role/specialty selection where multiple memberships exist
- Account, preferences, notification settings, help and access denied
- Public center-application form → application submitted → platform review → approved/rejected with rationale → center invitation → first admin onboarding
- Support direct center provisioning by platform operators without external application

**Visual login design:** At 1440px, split screen: a strong but restrained ~625px left brand/story panel and ~815px right form area. Place the login content in a centered form region ~550px wide with generous top spacing; clear “Welcome back” heading, role context (derived from account, not a login security bypass), email/password fields, obvious sign-in and account recovery. Mobile stacks to a full-width form with a compact brand strip.

### B. Platform administrator

Primary sidebar: Overview, Center applications, Centers, Plans & trials, Platform users, Operational events, Support, Settings.

**Overview:** active centers, pending applications, trial centers, operational alerts; recent platform events. **Applications:** applicant information, status, reviewed-by, approval/rejection decision, immutable audit entry. **Create center:** organization details, package, owner administrator identity, unique tenant. **Center detail:** status, trial/subscription, active user/child counts, safe operational metrics, plan limits and actions. **No raw clinical data browsing.**

### C. Center administrator

Primary sidebar: Overview, Children, Invitations, Calendar, Packages, Replacements, Billing, Settings.

**Overview:** operational snapshot, upcoming sessions, staff and invitation status, onboarding tasks, trial use and limitations. **Children:** register fictional child, administrative profile, consent/grant status without automatic exposure of restricted clinical content. **Staff:** invite/reactivate/deactivate professionals, assign specialties and permitted caseloads, manage replacements and transfers with audit. **Invitations:** pending/expired/accepted. **Calendar:** manage center sessions, staff availability and administrative conflicts. **Packages/Billing:** active plan, trial days, used quota, upgrade path and invoices where integrated. **Settings:** basic brand/contact details, timezone, operating hours and safe notification configuration.

**Trial policy for prototype:** configurable 30-day free trial, maximum **one child and three therapists** per center; enforce on the backend including concurrent creation, not merely disabled buttons. Center application is not automatically activated; it needs approval. Trial expiry must not delete data; place center in an explicit restricted state with clear messages and a safe conversion route.

### D. Secretary / Coordinator

Primary sidebar: Today, Calendar, Appointment requests, Children (administrative directory), Staff availability, Messages (operational), Settings.

Prioritize time-based work queue and visual agenda. Schedule/move/cancel sessions with practitioner, specialty, room/location, time, attendance and cancellation reason. Handle collisions and changes. A coordinator must not be able to open an unshared note/report merely by following an inferred URL.

### E. Therapist

Primary sidebar: Dashboard, Calendar, Children, Sessions, Reports, Weekly plans, Messages, Settings.

**Therapist dashboard:** context line e.g. “Monday, 19 October · Speech therapy workspace” (use dynamic date, never hardcode it in production); badges for today's appointments and pending reviews; the day’s calendar as the dominant section; quick access to assigned child and session; current plan or report tasks. No mixing OT/ABA/Speech sessions into the active specialty calendar unless a clearly labeled All specialties filter is selected. If therapist has more than one specialty, show a conspicuous switcher with explicit filters and specialty tags on appointment cards.

**Child workspace:** structured overview, assigned providers, goals, sessions, progress, reports, plans, evidence, guardians, access and restrictions. Use context tabs; never lose the current child when moving between related pages. **Session flow:** scheduled → ready → start session → mark activities/observations → note editor → save as draft → reconcile conflicts/errors → confirm persisted result → close session (subject to state rules). **Note editor:** meaningful fields, validity indicators, autosave status, version check, conflict and expired-session cases. Do not show a false save receipt.

**Reports:** clinician-controlled draft generation (AI assistance only if enabled), source-to-sentence review, correction/omission decisions, exact frozen version preview, approval/sign/release controls withheld pending clinical policy; versions and amendments clearly distinct. **Home plans:** goal-linked activity prescription, weekly schedule, guardian-facing exact preview, frozen/approved/released distinctions, recipient access. An unreleased or unsigned document may NEVER appear in the guardian portal as if published.

**Progress:** evidence-based observations, goal measurements over time, visible source and timestamps, empty-data and insufficient-data states. Never invent a trend or clinical conclusion.

### F. Clinical supervisor

Primary sidebar: Overview, Assigned caseload, Review queue, Plans & reports, Progress, Team, Audit, Settings.

Show clinical review only within supervised/authorized assignments, with clear distinction between reviewer, signer and release authority. Support review comments, decision requests, assignments and provenance. Until exact owner-approved policy exists, approvals/co-signing/signatures/releases are represented as disabled protected transitions with explanations; never silently grant these powers.

### G. Parent / guardian (family portal)

Primary sidebar: Home, My child, Home plan, Activities, Progress, Messages, Account. On mobile: Home, Plan, Activities, Progress, More. Consistent teal active styling across every destination.

**Home:** friendly greeting, selected child context, this week's plan, next appointment, only actually released information, clear primary activity CTA, concise therapist message or request status. Background `#FAF8F5`, friendly warm cards, same TheraBridge typography. Avoid a cramped or ugly “Your week together” table: use spacious horizontal day chips on desktop and vertically stacked activity cards on mobile, with clear day, title, duration/status and balanced icon/text alignment.

**My child:** family-facing non-sensitive profile summary and team contact names where authorized. **Home plan:** exactly released version, objective and therapist instructions, safety/consent notes, activities by date and version metadata. **Activities:** step-by-step family-friendly instructions, complete/skipped/needs help outcomes; clear confirmation only after persistence. **Progress:** accessible, appropriately qualified progress summaries and no fabricated achievements. **Messages:** participant-scoped threads only if enabled; no universal messaging bypass. **Reports:** only recipient-released signed report versions, not draft documents. **Access-denied:** clear explanation for withdrawn release, revoked grant, consent or version mismatch, with safe navigation back.

**Family dark mode:** maintain all routes and readability in the official dark palette above. A light/dark switch must never expose a different child, role or stale protected content.

## 6. End-to-end core journeys (not a disconnected screen catalogue)

**Journey 1: Center onboarding** — applicant completes center request → platform sees pending → review + approval/rejection → platform provisions tenant → invite center administrator → admin accepts invitation → configure trial → center overview.

**Journey 2: Child onboarding** — admin registers child (fictional) → creates guardian invitation → consent/grant checks → registers treatment specialties → assigns therapist(s) → appears only on the correct therapist's caseload → scheduling enabled.

**Journey 3: Multispecialty therapist** — clinician selects center → active specialty (e.g. Speech) → sees only Speech appointments by default → switches to OT if authorized → assigned children and appointments refresh correctly → uses an explicit “All specialties” mode when needed.

**Journey 4: Session and note** — appointment card → child context → start session → activity outcomes/observations → note editing → local draft/pending/save success only after persisted commit → conflict/failed save/expired-session recovery → record version history.

**Journey 5: Plan and report** — clinician reviews evidence → creates goal-based plan/report draft → verifies sources → freezes exact version → exact recipient preview → requests formal approval → protected signature/release gates remain unavailable until owner rules are signed → when appropriately implemented and approved, released version only goes to the named eligible guardian.

**Journey 6: Family activity** — guardian accesses eligible released plan → sees this week's activity → completes or skips with reason → backend records idempotent outcome → therapist sees family evidence in assigned child view where permitted → progress updates only from actual valid data.

**Journey 7: Family requests an accompanying home plan** — guardian has a released report but not an accompanying plan → submits a scoped request → pending state and duplicate-request prevention → assigned clinician receives inbox entry → clinician drafts a plan → exact version and recipient checks → release gated by approved policy → guardian sees only a legitimate available release. Include denial states for revoked guardian access, duplicate pending request, notification delivery failure and stale permission/consent/version.

**Journey 8: Revocation, expiry, transfer** — staff assignment or guardian grant revoked, free trial expired or case transferred → relevant backend permissions change atomically → stale browser tabs cannot continue protected operations → UI displays access denied or restricted state without leaking resource content.

**Journey 9: Cross-role coherence** — calendar updates, assignments and activity outcomes appear accurately in the relevant views; one shared database source of truth; not separately hardcoded synthetic cards per role.

## 7. Minimum domain entities (conceptual, adapt after architecture review)

PlatformUser, AuthenticationIdentity, Center/Tenant, Membership, RoleAssignment, CapabilityAssignment, CenterApplication, CenterPlan, TrialSubscription, TrialUsage, Invitation, TherapistProfile, Specialty, TherapistSpecialty, Child, GuardianLink, GuardianGrant, ConsentPurpose/ConsentRecord, ChildAssignment, Appointment, Session, SessionObservation, SessionNote/NoteVersion, Goal/GoalVersion, ProgressMeasure, ActivityTemplate, ActivityPrescription, Plan/PlanVersion, Report/ReportVersion, PreviewSnapshot, ApprovalRecord, RecipientRelease, ReleaseWithdrawal, FamilyOutcome, CommunicationThread, NotificationOutbox, SafeguardingConcern, AuditEvent and IdempotencyRecord.

Use separate lifecycle entities for drafts/versions/approvals/releases/grants/consent; do not represent everything with a generic `status` field on one huge object. Ensure strong tenant and child-scoping relationships and comprehensive database constraints. Avoid storing sensitive clinical data in logs, search indexes or generic notification payloads.

## 8. Technical feasibility and architecture

Preferred V1 architecture, subject to demonstrated support:
- Next.js App Router, React, strict TypeScript, Tailwind, accessible component primitives.
- Backend in NestJS using Fastify; Next route handlers only for narrow auth/proxy purposes; no split domain logic.
- PostgreSQL + Prisma, with transactions enforcing current role, tenant, child assignment, consent, grant and exact-version binding at commit time.
- Standards-based OIDC authentication; secure session handling and server-side policy checks.
- Redis + BullMQ for safe asynchronous jobs; private S3-compatible media storage; worker process for background jobs.
- Environment-separated secrets, migration scripts, seed scripts and tests. Avoid unsupported or unpinned major versions.

**If the builder cannot provide this stack, stop and present a precise compatibility table.** Offer an isolated synthetic proof of concept as an alternative, but do not silently substitute a different database/backend and call it our production architecture. Architecture deviations require explicit approval.

## 9. Real interaction contracts and denial cases

Every screen must define: entry conditions; visible user context; data source; allowed actions; navigation outcomes; error states; server permissions; audit consequence; test assertions. All mutations require authenticated server operations, not client-only state. Revalidate authorization and resource versions server-side even if a button was displayed. Ensure idempotency and concurrency handling for repeated submit/save requests.

Keep these disabled in the synthetic prototype without approved clinical policy: legal/clinical signing or co-signing, guardian release of clinical documents, protected media recording/upload without consent model, safeguarding workflow requiring designated lead, unrestricted messaging and any external clinical AI processing. Surface disabled states honestly.

Required negative paths: unauthorized tenant, unrelated child, expired/revoked guardian grant, clinician no longer assigned, stale plan/report version, missing consent, save failure, duplicate pending request, notification outbox failure, session expiry, simultaneous update conflict, quota exceeded, trial expired, no data, offline interruption. Distinguish successful backend persistence from optimistic local UI.

## 10. Demo dataset and illustrative copy

Use only openly fictional test records. Examples: “Harbor Child Development Center” (synthetic tenant), “Leila Hassan” (synthetic Speech therapist), “Sara Morgan” (synthetic guardian), “Alex Morgan” (synthetic child). Provide at least two isolated centers for tenant-leak tests, two clinicians with different specialties, one therapist with dual Speech/OT assignments, one guardian with named access, one guardian without access, a center applicant, and an expired trial center.

Never present seed names as real persons or clinical findings. If using sample clinical content, label it clearly as fictional and avoid prescribing therapy or implying an actual medical recommendation.

Copy: warm and concise for families (“Today’s activity”, “Ready to try?”, “We couldn’t save this yet — retry”), clear and neutral for clinicians (“Draft not saved”, “Current specialty: Speech”, “Plan awaiting authorized review”), operational for administrators (“Application pending”, “Trial limit reached”). Avoid false assurances and technical jargon in family-facing text.

## 11. Working phases and deliverables

**Phase 0 — Plan and feasibility:** Assess exact-stack compatibility and enumerate architectural gaps, entity diagram, roles and DENY-by-default policy, screen/route map, shared design system, testing strategy and phased cost/credit risks. No code without explicit approval.

**Phase 1 — Center foundation:** Login and role/tenant scoping; platform dashboard; center application with approval; direct creation; administrator invitations; center admin overview; trial cap 30 days/1 child/3 therapists; audit and denial tests. Functional backend/data persistence and 5-width responsive tests.

**Phase 2 — Care operations:** Child/guardian administrative onboarding; staff specialties and assignments; scheduler and therapist calendars; assigned caseload; session workflow and resilient session-note drafts.

**Phase 3 — Clinical drafts and controlled plan workflows:** goals, progress observations, plans/report drafts, source review, revision, exact-version family previews and disabled policy-dependent approvals/releases.

**Phase 4 — Family workspace:** eligible family dashboard, activities and outcomes, progress, responsive dark mode, report-without-home-plan request; no prohibited release bypass.

**Phase 5 — Governance and completeness:** supervisor work queues under owner-approved permissions, safeguarded communication where authorized, notifications/outbox, advanced error states, accessibility, end-to-end coverage, security and compliance review.

For EVERY completed phase provide actual running routes, screenshots at 320/390/768/1024/1440, database schema and migrations, API contracts, test report (real executed pass/fail, not estimates), permissions matrix, known defects, and a workflow-to-screen-to-endpoint-to-test traceability table. Never call static clickable mockups end-to-end tested. Treat clinical pilot and production release as explicitly NOT AUTHORIZED.

## 12. First requested response from the AI builder

DO NOT WRITE CODE YET. Respond with:

1. Can you build the preferred stack? Answer yes/no/partial for each named technology and explain verifiable deviations.
2. Propose monorepo/app structure, environment strategy, database model and isolation controls.
3. Define roles and a preliminary permission matrix; explicitly mark unresolved clinical authorization as DENY.
4. Provide Phase 1 detailed screen inventory and screen-by-screen layout.
5. Provide Phase 1 APIs, data mutations, authorization checks, state diagrams and error cases.
6. Provide the detailed official-theme token implementation plan (including light/family dark, text fonts, sidebar/navigation behavior, responsive breakpoints).
7. Provide testable Phase 1 acceptance criteria and actual verification method.
8. List decisions requiring owner approval and a realistic risk register.

**Only after this plan is approved, implement Phase 1 end to end.**


## 13. Mandatory continuous ownership and independent takeover

**Companion contract:** `TheraBridge_Emergent_Continuity_Protocol.md` is mandatory for every build phase. Its handover, GitHub snapshot, provenance, reproducible setup, data portability, and documentation requirements are part of this blueprint, not optional polish.

**Ownership rule:** The owner must be able to discontinue Emergent and resume development from the **latest verified exported GitHub commit**. Emergent is a temporary implementation agent; the resulting source code, specifications, tests, data model, migrations, architectural rationale, and local-start instructions must reside outside its chat history. Each completed work unit requires a verified GitHub snapshot, updated living handover documents and executed test evidence.

**Repository separation:** Preserve `NTinkicht/TheraBridge` as the private canonical specification source. Proposed synthetic-POC application repo: `NTinkicht/TheraBridge-Emergent`. Never directly overwrite canonical `main`. Do not presume the two repositories synchronize automatically.

**Portability proof:** Demonstrate from a fresh independent clone that the code installs, starts, seeds fictional data, passes tests, rejects cross-tenant access, and can be modified via a PR without Emergent. Disclose any Emergent-only managed database, authentication, file storage, platform key, deployment feature or manual configuration that prevents the drill.

**Platform-specific caveat:** Emergent's `Save to GitHub` is a one-way snapshot/export operation, not continuous bidirectional synchronization; importing a repository is a new-job operation. Code export omits database contents, environment secrets and installed packages. Do not claim an unexported workspace is recoverable from GitHub.

**Initial response change:** In addition to the nine Phase 0 items above, propose the actual file tree for the living handover pack, one-work-unit checkpoint demonstration, and the cold-clone takeover drill. Begin coding only after the owner approves this plan.