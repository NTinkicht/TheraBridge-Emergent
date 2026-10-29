## First independent review dispositions — 2026-10-29

- `FIX_NOW` performance suggestion: removed the read-only interactive transaction and its row locks from readiness. The endpoint performs fresh active manager membership/role verification and bounded, tenant-scoped, lock-free reads. These are advisory observations, **not a serializable or authorizing snapshot**; checkedAt records evaluation time.
- `FIX_NOW` UI status consistency: Check readiness updates both the displayed proposal status and the checklist from the same server response. An explicit checkedAt timestamp and recheck guidance prevent assuming a cached checklist is still current.
- `FIX_NOW` tests: child archive after ACKNOWLEDGED must set CHILD_SERVICE_ACTIVE false with INCOMING_RECEIPT true, and a clinical supervisor must receive HTTP 403. Both added to PostgreSQL e2e.
- `DEFER_ISSUE` broader two-session Playwright acceptance [#114](https://github.com/NTinkicht/TheraBridge-Emergent/issues/114): backend and UI code fixed in this PR; dedicated cross-role browser fixture planned separately.
- `DECLINE_WITH_REASON` none.
- Independent first-round reviewers and Codex found no security/clinical blockers at original `7b6551f8dc`; their reviews do not automatically qualify the corrected HEAD. Six new-head CI jobs and round-two review required before merge.

# TB-EM-050 — Non-authorizing operational handover readiness snapshot

**Workstream:** Therapist replacement and controlled clinical handover, following merged PR #111 (TB-EM-049).
**State:** Implementation on a separate draft feature branch; qualification and clinical policy gates not yet verified.

## Outcome

Before attempting any real therapist replacement, a center administrator or coordinator can inspect a **read-only snapshot** of the existing synthetic handover proposal. Acknowledgement is evidence of operational receipt, *not* clinical transfer permission.

Manager-only endpoint:

`GET /api/centers/:centerId/governance/handover-proposals/:id/readiness`

- Permissions: `center.governance.read`, strictly CENTER_ADMIN/COORDINATOR; `assertActor` rechecks active center membership; proposal is looked up by `id+centerId` and only TB-EM-049 lifecycle statuses are accepted.
- Flag: `HANDOVER_DEMO=true` and environment not staging/production; otherwise HTTP 403. No hosted/production enablement requested.
- Snapshot: proposal open, named incoming therapist acknowledged, child service remains active, outgoing assignment remains active, incoming therapist remains active with the matching specialty.
- **Permanent fail-closed blockers:** signed clinical authorization; purpose-specific consent; approved clinical handover scope and receiving clinician acceptance. These remain **false** regardless of operational checklist state or database consent drafts.
- Response always includes `readonly:true`, `readyForTransfer:false`, `assignmentChanged:false`, `accessGranted:false`, `clinicalHandover:false`, `released:false`, `synthetic:true`.
- No API to approve/execute transfer, activate a replacement, grant a specialty, change permissions, move plans/reports, send clinical text, or release to guardians. No snapshot persistence or token that could later be treated as an authorization.

## UI and testing

Center manager child Care Team → TB-EM-049 handover panel → **Check readiness**. Displays all operational checks and explicit governance blockers, with a note that this is not approval. Incoming therapists cannot view the readiness endpoint or any additional patient identity.

Real PostgreSQL integration regression in `handover.e2e-spec.ts` checks manager read, therapist denial, nonexistent and other-center proposals, changed specialty/assignment, nonauthorizing status when acknowledged, cancelled state, default-off flag, no readiness audit writes, no assignment/consent/release mutation.

## Follow-up

Actual assignment switch, transfer provenance, clinician-to-clinician sensitive record access, purpose-bound consent, safeguarding and sign-off requirements are **owner/clinical governance decisions**, not automatic next implementation. Hosted QA #81 remains incomplete. The independent P3 history refinement remains issue #112; not in this focused PR.

## Qualification

At first authoring the new exact-HEAD six-job CI, independent review and PR merge are **NOT VERIFIED**. No Codex request on intermediate commits; follow mandatory `AGENTS.md` review disposition policy.
