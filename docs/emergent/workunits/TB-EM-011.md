# TB-EM-011 — Clinical governance and controlled release readiness

Synthetic engineering foundation only. **Clinical activation, real patient use and production deployment: NO-GO.** Independent review pending. Branch `freebuff-tb-em-011-governance`, based exactly on `90e474f477a654d47cf934429d2ca03256fd74d2`. No merge of PR #48/#49 and no changes to their branches.

## Checkpoint A — architecture and policy inventory

Inspected the existing work-unit/handover specifications, accepted design direction, tokens, design guidelines, Prisma schema and migrations, clinical/report/practice services and controllers, role/session/CSRF authorization, append-only events, clinical release locks and integration tests. Existing plan versions were mutable drafts; report versions were immutable on update but not deletion. Existing plan replacement silently superseded a version under review (N25). Reports combined observations by goal key across differently defined versions.

Canonical private repository `NTinkicht/TheraBridge`: **not accessible**. GitHub CLI reports no authentication; the unauthenticated repository API returned HTTP 404. Its SRS, software design, architecture, risk management and decision registers were **not verified**. This is an access/specification gap, not evidence that those documents do not exist. Public issues #39, #40, #43 and #44 were retrieved and read. Local controlled specifications do not resolve the decisions below.

| Decision | Technical handling | Human gate |
|---|---|---|
| D1 signing/approval | Internal draft/review states only; no signing/approval permission | Accountable clinical signing and approval semantics |
| D4 guardians/custody | Separate guardian-link principals; no inferred household sharing or custody rules | Approve recipient restrictions and custody handling |
| D7 consent | Separately versioned policy and immutable record proposals; authorizes=false | Purpose, scope, evidence, expiry and revocation policy |
| D-NEW-3 release | Authorization, snapshots, recipient releases and release history are distinct | Protected recipient lifecycle and withdrawal semantics |
| D-NEW-5 messaging/media | Existing synthetic messaging/practice gates remain; no media/AI/recording activation | Safeguarding-dependent communications policy |
| OR-15 / OR-16 | Readiness shown as blocked; no administrator override | Clinical and operational readiness sign-off |

## Implemented scope and actor workflows

- **Assigned therapist:** open `/app/governance`, choose a plan/report, supply a reason and expected revision, submit for internal review, explicitly withdraw a reviewed version, or freeze an editable version internally. Inspect history and exact immutable previews. Plan authors can create the next draft only after explicit withdrawal or internal freezing. Returned drafts can be edited and resubmitted. Withdrawn reports can resume as drafts; their earlier snapshots remain immutable.
- **Clinical supervisor:** choose the review queue, inspect the preserved content/evidence, add comments or return for revision using the displayed revision. These actions do not approve anything. Review actions retain the evidence captured at submission even if later observations arrive.
- **Center administrator/coordinator:** `/app/access-review` shows children, individual guardian connections and revocations, pending/revoked/expired invitations, portal capability categories, unresolved restriction proposals, read-only policy/record versions and operational event inspection. Clinical records and clinical event payloads are excluded. A caseload transfer simulation records a request and changes no assignment or clinical access.
- **Guardian:** existing sample activity, progress and practice experiences only. Neither new governance screen, clinical history nor frozen previews is authorized. Revoked links remain excluded immediately, including the accepted #47 outcome/replay protection.
- **Platform administrator:** existing platform operations only; no new center or clinical entitlement.

All screens use the existing shell, logo, typography, palettes, tokens, controls and responsive conventions. No design-token, brand-asset or family-theme changes.

## Exact API surface

All paths below have the prefix `/api/centers/:centerId` and use existing session/context authorization and CSRF/Origin checks on mutations.

| Method/path | Permission and behavior |
|---|---|
| `GET /governance/documents` | `center.clinical.read`; assignment/service-scoped plan/report status list, owner and child names |
| `POST /governance/documents/:kind/:id/transitions` | `center.clinical.read` plus transactional role/owner/action checks; kind `PLAN` or `REPORT`, body `{version, action, reason}` |
| `GET /governance/documents/:kind/:id/history` | `center.clinical.read` plus child/service scope; append-only transitions and snapshot identifiers |
| `GET /governance/previews/:id` | `center.clinical.read` plus current source-child/service access; immutable stored artifact, view event |
| `GET /governance/access` | `center.governance.read`; operational governance only, never clinical content |
| `POST /governance/transfer-simulations` | `center.governance.read`; tenant/assignment checks, simulation only |
| `POST /governance/release` | `clinical.report.release`: DENY for everyone |
| `POST /governance/consent-grants` | Unknown/ungranted `clinical.consent.grant`: DENY for everyone |

Existing plan `/submit` now requires `{version}`; plan `/return` and report `/comments` and `/return` require `{version, comment}`. Their controllers use the same lifecycle transaction as the new endpoint. Existing report submit already required a version. No alternative review mutation service remains. Clients and integration tests were updated together; omitted concurrency tokens return 400.

Existing staff-only `GET /clinical/plan-versions/:id/family-preview` and `GET /clinical/reports/:id/family-preview` now create an identified immutable artifact with source revision, timestamp and SHA-256. Repeating generation creates a **new ID**, explicitly distinct from reopening an old ID. Existing IDs always resolve stored content/evidence through `/governance/previews/:id`. Guardian routes do not read any of these tables.

## Permission matrix

| Capability | PLATFORM_ADMIN | CENTER_ADMIN | COORDINATOR | THERAPIST | CLINICAL_SUPERVISOR | GUARDIAN |
|---|---|---|---|---|---|---|
| Operational access/consent review | Deny | Yes | Yes | Deny | Deny | Deny |
| Transfer simulation (no grants) | Deny | Yes | Yes | Deny | Deny | Deny |
| Clinical queue/history/previews | Deny | Deny | Deny | Assigned child/service | Center clinical scope | Deny |
| Edit/submit/withdraw/freeze | Deny | Deny | Deny | Author + active assignment | Deny | Deny |
| Comment/return | Deny | Deny | Deny | Deny | In-review only | Deny |
| Signing/final approval/release | Deny | Deny | Deny | Deny | Deny | Deny |
| Consent grants/media/AI/recording | Deny | Deny | Deny | Deny | Deny | Deny |

UI visibility is not authorization. All new clinical services recheck live actor membership, role, user and center status in PostgreSQL transactions. Lifecycle transactions hold the center write lock and membership/role/child/assignment locks, then recheck source status, revision and authorship before writing. Optimistic revision mismatch returns 409; failed transactions leave no orphan snapshot or transition history.

## State transitions

| From | Action | Actor | To | Preserved artifact |
|---|---|---|---|---|
| DRAFT / RETURNED_FOR_REVISION | SUBMIT | Assigned author | IN_REVIEW | Exact submitted content and evidence |
| IN_REVIEW | COMMENT | Supervisor | IN_REVIEW | Submission-bound evidence, reviewer comment |
| IN_REVIEW | RETURN | Supervisor | RETURNED_FOR_REVISION | Reviewed content/evidence, reason |
| IN_REVIEW | WITHDRAW | Assigned author | WITHDRAWN | Reviewed version retained; explicit reason |
| DRAFT / RETURNED_FOR_REVISION | FREEZE | Assigned author | FROZEN_INTERNAL | Exact content/evidence; **not approval** |
| WITHDRAWN (report only) | REOPEN | Assigned author | DRAFT | Prior withdrawal snapshot retained |
| WITHDRAWN / FROZEN_INTERNAL (plan) | Existing new-version endpoint | Assigned author | New DRAFT, old status unchanged | Old content retained; new version number |

Every lifecycle mutation increments the editable resource revision and records an immutable history entry, reason, actor, source revision and snapshot ID. `SUPERSEDED` remains a legacy status, distinct from withdrawal; the new workflow does not invent clinical supersession semantics. Approval, signing, release and clinical supersession are not lifecycle shortcuts.

## Checkpoint B — persistence and integrity

Migration: `20261028090000_tb_em_011_governance`. Existing migrations are untouched. Explicit non-authorizing status checks are expanded to include returned/withdrawn/internal-frozen states, while all approval/sign/release values remain prohibited. The original plan one-open index and report-release refusal trigger remain; a second index includes returned editable drafts.

| Structure | Purpose / restrictions |
|---|---|
| `governance_snapshot` | Exact document revision, center/child/author, frozen content/evidence, generation actor/time and canonical SHA-256; update/delete refused |
| `governance_history` | Append-only status/reviewer/withdrawal history referencing a scope-checked snapshot |
| `consent_policy_draft` | Separate immutable purpose/policy version/restrictions; only DRAFT_NON_AUTHORIZING |
| `consent_record_draft` | Individual child/guardian-link/policy proposals; effective/expiry dates, restrictions, previous revision and revocation; immutable; authorizes=false and authorization evidence empty enforced in DB |
| `clinical_authorization_decision` | Separate future clinical authorization concept; all inserts/updates refused |
| `recipient_release` | Individual guardian-link/child/snapshot/decision; all inserts/updates refused |
| `recipient_release_history` | Separate future release/withdrawal/revocation events; all writes refused |
| `caseload_transfer_draft` | SIMULATION_ONLY, scoped source/target memberships, child/service/reason; creates no assignment |

Snapshots/history/policy/consent rows are immutable on UPDATE and DELETE. Report-version DELETE now has the same refusal as UPDATE. Plan/report identity is immutable; content cannot be overwritten after leaving an editable state. Database triggers validate snapshot source-child-center, consent principal-policy-center/revision and transfer-simulation scope. Observation note associations are validated both transactionally and in PostgreSQL for center, child, therapist and compatible service (#39).

Hash contract: lowercase SHA-256 of canonical JSON `{centerId, childId, kind, documentId, sourceVersion, authorId, content, evidence}`. Object keys are sorted recursively; arrays retain order; dates are captured as ISO text. Reading a JSONB round-trip produces the same hash. Generation time/actor are stored separately; a fingerprint is not a signature or authorization decision.

Report/dashboard evidence uses `(planId, planVersionId, goalKey)` identity and retains units/measure, baseline and target. Different plans for the same service remain separate; reports do not arbitrarily choose the first plan. There is no inferred continuity across versions. Observed goal definitions cannot be changed in place; unchanged definitions and unobserved goals can still be saved. New plan versions provide an explicit new definition context (#43).

## Checkpoint C — screens and previews

- `/app/governance`: all clinical documents, supervisor queue, explicit actions/reasons, ownership, child, revision, status history, frozen content/evidence and printable internal preview.
- `/app/access-review`: operational-only guardian and consent-readiness administration, invitation lifecycle, events and transfer simulations.
- Existing `/app/clinical/:childId`: plan edit/submit/return use author and revision controls; new version action appears after withdrawal/freezing; immutable home-format preview and governance link.
- Existing `/app/reports/:id`: accurate non-authorizing state labels, revision-bound review and immutable family-format preview with fingerprint.
- Every internal preview displays **“Internal preview — not approved, signed or released.”**

## Checkpoint D — validation and traceability

See `artifacts/tb-em-011/VALIDATION.md`, test logs and `browser-results.json` for actual final results and limits. The new PostgreSQL suite is `apps/api/test/governance.e2e-spec.ts`. No test was disabled or relaxed. Existing clinical tests changed their requests to include concurrency tokens and now assert explicit withdrawal and RETURNED_FOR_REVISION instead of the superseded unsafe behavior.

| Requirement / finding | Verification |
|---|---|
| Lifecycle, ownership, review/return, explicit withdrawal, N25 / #40 | Governance suite plus adapted existing clinical/report tests |
| Conflicting and concurrent edits/transitions, transactional revocation | Governance concurrent-transition and controlled waiting-transaction tests; existing report autosave conflict test |
| Immutable snapshots, historical versions, canonical hashes | API readback, DB update/delete refusal and content freeze assertions |
| #39 observation provenance | Parameterized child, tenant, therapist and service mismatch tests at API and DB; existing valid self-note flow |
| #43 evidence identity | Different unit/target versions, multiple same-service plans, dashboard separation and measured-definition edit tests |
| #44 exact preview | Snapshot reopening after later draft/observation changes, submission-bound review evidence, compatibility preview IDs |
| Cross-center/child and administrator/guardian denial | Queue/history/preview API tests, snapshot DB scope checks, existing tenant suite |
| Guardian restrictions/revocation | Existing #47 race/replay suite unchanged; governance capability and family activity revocation assertions |
| Consent not authorizing; release API/DB locked | Immutable record revision/revocation, grant prohibition, per-role API denial and DB release/authorization insert refusal |
| Transfer simulation | Assignment rows compared before/after; no grants |
| Accepted visual direction/family isolation | Playwright role flows, five supported widths, screenshots; original design reference comparison |

## Demonstration-only, disabled and not implemented

**Implemented/tested:** synthetic draft/review/withdrawal/internal-freeze persistence, snapshot/hash/history, guarded APIs, role-specific governance screens, read-only consent proposals and transfer simulations.

**Demonstration-only:** existing family sample progress/practice/messaging; local governance seed fixtures. `seed-governance-synthetic.ts` requires a non-production environment and existing synthetic Harbor account/assignment; it never creates an assignment. Browser acceptance provisions a synthetic child/assignment through existing administrator APIs and connects an already-seeded guardian strictly as a local fixture.

**Disabled by policy:** clinical signing, final approval, consent grants, actual authorization decisions/releases, media/AI/recording, real patient use and production deployment. There is no policy approval button, administrator override or configurable “enable release” flag.

**Not implemented / TB-EM-012 dependencies:** clinical authorization workflow, real consent evidence collection/verification, custody adjudication, release recipient activation/revocation semantics, real caseload transfer approval/execution, cross-version goal continuity, real patient migration/retention/access-log policy, clinical production readiness. These require the canonical controlled documents and accountable human decisions listed above.

Earlier review records created before TB-EM-011 have no retrospective governance snapshot; their existing history remains available. First governance capture records the current synthetic state rather than claiming to reconstruct lost historical evidence. No real clinical validity is asserted. Internal printing uses the browser print facility; it is not a signed/export-controlled clinical PDF. Lists are bounded by existing V1 synthetic caseload expectations; operational events show the latest 100 and exclude payloads. Broad historical issue closure outside the intersecting #39/#40/#43/#44 behavior is not claimed.

## Checkpoint E — independent-review handoff

Commit/push only this feature branch. Draft PR target: `freebuff-qualification-issue47-20261021`. No merge, auto-merge or deployment. GitHub CLI authentication is unavailable; if draft PR creation remains blocked, provide the pushed branch/SHA and prepared description for the independent reviewer to create it. Exact changed-file inventory is in `artifacts/tb-em-011/changed-files.txt`.
