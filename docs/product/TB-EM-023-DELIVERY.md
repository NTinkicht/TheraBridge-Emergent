# TB-EM-023 — Combined P1/P2/P3 synthetic V1 delivery and qualification

## Second Codex P2 — FIFO autosave ordering (2026-10-24)

Codex's exact-head review at `a1f3fa8043` found that autosave B and decision flush C could both wait for in-flight autosave A; B then cleared `dirty` before completing its PATCH, allowing C to return success and submit the decision ahead of B. A successful decision could remount and discard pre-submit clinician text after a version conflict. This is distinct from post-submit editing.

The correction replaces the HTTP-only `inFlightSave` check with a **FIFO chain of complete save operations**. Every invocation captures the prior queued promise and awaits its successful completion *before checking dirty state and issuing a PATCH*. The decision's final flush is queued behind any pre-existing saves, so it cannot return or re-use the report version while a preceding autosave request is pending. Version numbers are obtained only from successful predecessor responses; errors stop the chain with unsaved text preserved. The existing parent-owned editing lock protects post-submit typing.

The seven-role Chromium journey now holds autosave A, queues a second save B, triggers a decision C, releases A and ensures C has **not** posted while B is held. After B completes, it verifies both predecision text markers and database state survive the report-version remount. A separate delayed decision POST test still checks the post-submit lock. Latest exact-head CI and independent review REQUIRED. No Render deploy or clinical NO-GO relaxation.


## Incremental code-review P2: no lost drafts during decision/reload

Codex exact-head review at `d965842e` confirmed a clinician could edit report sections **after** the pre-decision autosave but **before** the POST response, and then lose that draft text on parent key/version remount (the autosave debounce was cancelled by unmount). This is a true P2 data-loss bug, and old NO_BLOCKING_FINDINGS verdicts are superseded.

Correction: ReportEditor owns an immediate decision transaction lock (ref plus visible state), disables *every* report section, Save Version / Send for Review / Preview, guards stray input handlers, and waits for any existing autosave before the decision's version is sent. ReportDecisionAssist obtains this lock **before** its first async call, disables its source/text inputs during submission, and releases in `finally` on any failure. On success the server receipt triggers reload only while the parent editing lock is active. The browser test pauses an actual source-decision POST and checks disabled controls and retained predecision draft after reload. **New exact-head CI/review required; synthetic-only; no Render deploy.**


**Work unit:** TB-EM-023. **PR:** [#70](https://github.com/NTinkicht/TheraBridge-Emergent/pull/70). **Parent:** `main@b4eae4e8ce8609e72c96d63f3eb984e4fd84e42c`. **Qualification:** an independently reviewed, CI-green integration is REQUIRED; final correction's new exact SHA and CI should be read from the PR. No Render deployment, hosted acceptance or clinical/pilot activation is implied.

## Feature and workflow traceability

| Feature | Screen / implementation | API or storage | Tests / evidence |
|---|---|---|---|
| Persist reviewed deterministic report passages, omit, reconsider, stale warning | `ReportEditor`, `ReportDecisionAssist` | Existing `GET/POST /centers/:centerId/clinical/reports/:id/suggestion-decisions` (TB-EM-021) | `scripts/design/check-demo-journey.mjs`, API `report-decisions.e2e-spec.ts` |
| Scoped future visits | Child 360° | Authorized `GET /clinical/children/:childId`; 42-day scheduled horizon | `clinical.e2e-spec.ts` visits at +7/+41/+44 |
| Coordinator scheduling without clinical dead-link | Schedule panel | Existing scheduling permissions and clinical GET role checks | role browser journey and authz tests |
| Disabled messaging explanation | Messaging info page | **No thread requests, no messaging enablement** | role browser journey |
| Staff permission descriptions | Onboarding and invitation copy | no policy mutations | inspection + build |
| Guardian teal navigation and accessible practice switcher | ProductShell and Home practice | unchanged family/guardian API restrictions | five-width Chromium checks, tablist-negative, button group |
| Activity copy/edit | `TemplateActions`, library | Existing `POST activities/:id/duplicate`, `PATCH activities/:id` | `clinical.e2e-spec.ts` + isolated browser |
| Child-wide referent designation | Child administration CareTeam, scoped Child 360° | `PATCH /centers/:centerId/children/:childId/referent`; new child FK/revision; immutable `child_referent_history` | `operations.e2e-spec.ts` role/tenant/SQL/parallel races and `clinical.e2e-spec.ts` specialty masking |

## Database and contracts

New **additive** migration: `apps/api/prisma/migrations/20261103090000_tb_em_023_child_referent/migration.sql`. Existing `child` gains nullable `referent_membership_id` and monotonic `referent_revision`. `child_referent_history` stores centre/child/actor, previous and new membership IDs, a required rationale, revision and timestamp. DB triggers validate centre, current active therapist assignment, role, active user and specialty on designation, deny invalid history scope, and reject history UPDATE/DELETE. No prior migration modified. Centre-wide coordination designation **never grants clinical access**.

`PATCH .../children/:childId/referent` body: `{membershipId: UUID | null, version: integer, reason: 3–500 characters}`. Route requires `center.children.manage`, **plus in-transaction `CENTER_ADMIN` role**, centre trial writability, child-row lock, active eligible therapist/assignment, and optimistic child revision. Clear/reassignment/archival/last assignment ending appends immutable audit state. An invalid referent is hidden rather than granting visibility. A specialty-filtered therapist never sees the name of an out-of-scope therapist. The public UI uses generic unavailable copy, because an unavailable designation may mean invalidity **or** viewer scope.

**Global lock discipline:** centre lock → child `FOR UPDATE` → assignment/history. Applied to `setReferent`, child `setStatus`, and `endAssignment`. No trial-expiry behavior change is made to assignment termination.

**Evidence UI:** source identity/freshness is not factual or clinical validation. It displays `REFERENCED_NOT_VERIFIED` and differentiates `REFERENCES_UNCHANGED` vs `REQUIRES_REVIEW`. An APPLIED claim is a draft-only change; no clinical sign-off. Stale OMITTED/RECONSIDERED decisions permit renewed clinician-controlled action using current source fingerprint and optimistic report version, rather than trapping the user behind a non-operative reload instruction. Previously APPLIED decisions remain protected from duplicate insertion.

## Permissions matrix (all server-enforced)

| Action | Platform admin | Centre admin | Coordinator | Therapist (active assigned specialty) | Supervisor | Guardian |
|---|---|---|---|---|---|---|
| Designate/reassign/clear child-wide referent | Deny | **Allow** | Deny (even though can manage operational children) | Deny | Deny | Deny |
| Read operations child detail with referent name | Deny except authorized cross-context | Allow | Allow | Assigned child only | As granted by operations read permission | Deny |
| See referent in clinical Child 360° | Deny | No implicit clinical access | Deny | Own authorized specialty visibility only | Authorized clinical supervisor read | Deny |
| Submit report evidence decision | Deny | Deny | Deny | Report author only, scoped and current | Deny (read only where authorized) | Deny |
| Copy/edit activity template | Deny | Deny | Deny | Copy permitted source; edit only own active centre template | Policy-dependent existing manager permission and service authorization | Deny |
| Family discussion, signing, consent grant, release, safeguarding escalation, real AI/STT | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** |

No additional privilege was introduced by the referent designation, user interface affordances or evidence decisions.

## Review findings and remediation

- Codex P2: archive could read stale referent before locking child; resolved by centre→child lock before reading referent.
- Codex P2: `endAssignment` inverted lock order relative to clinical writes; resolved by centre-first locking without adding an expiry block.
- CodeRabbit: archive race independently confirmed; stale validation notice fixed.
- DeepSeek owner-posted supplemental review: reason omitted from displayed history event, raw event label, stale OMITTED/RECONSIDERED dead-end, misleading specialty explanation, weak direct database invariants, missing Speech/OT referent test, stale handover evidence. Implemented narrow corrections and scoped regressions. Owner-posted review is **not** an independent `ntk-reviewer[bot]` approval.
- Grok and Mistral exact-head `NO_BLOCKING_FINDINGS` at `73c4afb5317bf5eca1723242fcc61cdce01fd6fe` before DeepSeek advisory corrections; those verdicts do not transfer to newer commits.
- Accepted advisories: temporary UI idempotency key in memory (backend duplicate prevention); free-text numerical/date over-rejection; separate stored-but-no-longer-valid vs out-of-scope referent status; historical explicit referent revocation when staff specialty becomes invalid.

## Qualification and release limits

**Previous exact-head verification** `73c4afb5317bf5eca1723242fcc61cdce01fd6fe`: [CI run 40077499056](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40077499056) 6/6 PASS, 481/481 PostgreSQL tests in 15 suites; seven-role Playwright synthetic demo and targeted 320/390/768/1024/1440 geometry PASS. **Current new corrective commit: tests NOT YET RUN at authoring.** Reverify the latest HEAD and all six CI jobs; require new independent security review before merge. No external hosted browser acceptance of the new deployment (issue #61 remains open). No multi-browser/mobile physical device/accessibility certification. No clinical effectiveness testing.

**NO-GO:** all real patient data, clinical signing/co-signing, authorizing consent, release, safeguarding, family discussion, external generative AI/STT, pilot or production. Live Render/Neon synthetic hosted demo is deliberately unchanged during acceptance.
