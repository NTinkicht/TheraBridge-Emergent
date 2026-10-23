## TB-EM-020 — isolated activity-library backend draft (2026-10-24)

Next verify hosted exact-head CI and obtain independent read-only code/security review of activity-library duplication and optimistic author edits. Preserve live Render demo and ongoing Codex external UI QA. No change to release/consent, external AI, real STT, or patient scope. Do not merge or deploy without owner authorization. See docs/product/TB-EM-020-ACTIVITY-LIBRARY.md.

# Next work unit

## TB-EM-019 — exact-head requalification after advisory fixes

1. Verify draft PR #65 HEAD advanced from `b542159a` through a single reviewable advisory-hardening commit; inspect exact diff.
2. Wait for ALL six hosted Actions job conclusions at that **new exact SHA**; the author has not yet executed the new regressions at commit creation. Fix any actual failure on the SAME branch and repeat.
3. Obtain independent read-only Mistral re-review on the new HEAD. The previous NO_BLOCKING_FINDINGS verdict applies only to `b542159a`.
4. Keep MIS-003 and MIS-004 as product-policy discussion, not silent behavior changes; keep external HTTPS/UAT issue #61 separate.
5. Only owner can authorize merge or later synthetic hosted deployment. Real patient data, AI/STT, approval/release, consent, family threads and production/pilot remain NO-GO.


## TB-EM-019 — independent review and owner decision (2026-10-23)

1. Verify PR #65 exact HEAD against `main`, inspect the full 26-file implementation and the complete successful [hosted CI run 39999150532](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999150532) at implementation SHA `b6a15de2854a45691753d477ed0040b9cc17cac6`. After this documentation checkpoint, validate its newer exact HEAD too; never rely only on an ancestor's CI.
2. Have **Mistral independently review read-only** the review packet, new API validation/snapshots, role/specialty boundaries, traceable evidence, report draft concurrency and data separation. Record exact SHA, findings/severity, test evidence and limitations. This is *not* an approval to merge.
3. Fix any blockers on the **same draft PR #65** and re-request exact-head review. One writer/PR, no separate feature branch or merge by agents.
4. After review, obtain explicit owner merge/deploy permission. Keep live Render/Neon and Work's external QA of the pre-feature demo unchanged until authorized; do not close issue #61 as if external HTTPS QA were verified for this new PR.
5. Open follow-up work only for unresolved broader features: audit-persistent accept/omit decision history, cross-source contradiction detection, comprehensive Child 360 report/review state, real cross-browser visual testing, true AI integration (policy gated), explicit child-wide referent record (not inferred), production/pilot readiness.

NO-GO remains: real patient data, external AI, actual audio/STT, clinical signing/approval/release, consent authorization, safeguarding escalation, family messaging, pilot and production.

## Historical records below (do not use as current instructions)


## TB-EM-019 continuation (2026-10-23)
FreeBuff: pick up draft PR #65, branch feature/tb-em-019-child360-evidence-assist, after exact-head CI. Finish Child 360 provenance/team, advanced goal-version progress and explicit clinician-selected goal-to-home-activity linkage; strengthen evidence review, responsiveness and tests. NO real AI calls, clinical signing/release, family messaging, production or Render redeploy. Refer to docs/product/TB-EM-019-DELIVERY.md and issue #64. Independent Mistral review/owner merge decision follows. Entries below are historical.


## Uninserted transcript recovery correction — 2026-10-22

Exact uninserted transcript retained in copy-only recovery after remote completion; no automatic insertion. Fixture/live transcript, revocation/failure regressions PASS; 468/468 PostgreSQL tests (12 suites), types/builds, responsive DOM, fresh migrations and Gitleaks PASS. Isolated real two-tab Actions job added with disposable synthetic seed, read-only permissions and cleanup. Hosted exact-head results follow push; independent review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md. No issue #61 changes, merge or deployment.


## Multi-tab concurrency correction — 2026-10-22

Explicit conflict comparison/revalidated deliberate recovery implemented; stale autosave blocked. Full PostgreSQL 468/468 (12 suites), types/builds, real two-tab browser/API/database races and revocation/completion, responsive DOM and legacy migration PASS. Docker socket blocked; hosted exact-head status follows export. ChatGPT review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md for execution details and limitations. No issue #61 changes, merge or deployment.


## Final review corrections — 2026-10-22

Verify the pushed exact HEAD and hosted test/secret-scan/compose on PR #59, then ChatGPT performs primary independent review of the incremental diff. Mistral routine re-review is not required by this owner request. Do not merge/deploy or activate STT (#60). Exact SHA supplied in export handoff. Local correction evidence: artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md.


## PR #59 follow-up — 2026-10-22

Owner authorized the R1–R5 correction checkpoint and managed-Git export on the same feature branch. After export, ChatGPT will verify new exact-head hosted test/secret-scan/compose and coordinate fresh independent Mistral re-review using artifacts/tb-em-015/PR59-DISPOSITION.md. Export handoff supplies the exact SHA and remote/PR verification. GitHub CLI remains unauthenticated; no comment/request posted. Authorized start correction/amendment policy remains OPEN; all start rewrites fail closed. Retain DRAFT; do not merge/deploy.

## Historical addendum — TB-EM-015

Finish authenticated draft-PR delivery against main, obtain exact-head CI including Docker Compose on an authorized runner, and request independent read-only Mistral review. Address findings at a new exact HEAD and request re-review. No merge/deployment without owner approval. Do not activate real recording or external STT before signed governance decisions. Follow-up AI report/home-plan/chart milestones are not implemented by this patch. See docs/emergent/workunits/TB-EM-015.md and artifacts/tb-em-015/VALIDATION.md.

## Historical bootstrap plan

ID: `TB-EM-001`
Title: Architecture feasibility and export proof
Role: Platform administrator
Phase: 1 — Foundation + center onboarding

## Acceptance plan
- Emergent reads owner's complete blueprint and continuity protocol.
- Produces one explicit architecture feasibility/portability decision.
- Produces center creation/application/approval workflow plan with exact permissions.
- Proposes a small real vertical slice with real persistence, scoped authentication and negative tenant tests.
- Explains exact existing-repository branch export mechanism (no force push to main).
- Documents all service/data/secrets omitted from GitHub export.
- Requests owner plan approval **before coding**.
- After approval, first implementation checkpoint must include reproducible cold-clone instructions and actual test results.

Blocked until owner's Emergent plan is returned and accepted. No code implemented.
