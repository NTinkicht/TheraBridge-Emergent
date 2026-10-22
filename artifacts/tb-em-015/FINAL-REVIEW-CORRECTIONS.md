# PR #59 — final independent-review corrections

Reviewed parent: `9e0e739b002d7640e8e9a200eb4e638d09492ec3`. Existing branch: `freebuff/tb-em-015-session-workflow`. No second PR, merge, deployment, clinical activation or real speech processing.

## Corrections

1. **Operation-aware recovery** — SessionEditor previously reused the retained payload for either button. It now blocks conflicting actions while an outcome is unknown, retains the exact immutable payload/key for explicit replay, disables editing while saving/recovering, requires confirmation for every completion attempt, and treats explicit validation/authorization rejection separately from transport/5xx uncertainty. A 409 triggers authorized workspace reconciliation; completed sessions become read-only with local text retained. A newer in-progress version requires explicit review/save. Autosave cannot change an unresolved operation. Last-mutation hash/key, version checks and completed-record trigger remain unchanged.
2. **Consistent activity evidence** — server rejects performed outcome/assistance on SKIPPED/NOT_STARTED, requires objective/outcome/assistance on COMPLETED even for draft saves, rejects unresolved activities at completion, and rejects performed activities or nonzero actual minutes on NO_SHOW. Frontend requires confirmation before clearing performance fields, disables those fields for unperformed activities, and retains objective, timing, goal references and factual notes. Immutable snapshots/authorship and Observation behavior are preserved.
3. **Lossless transcript limits** — insertion returns explicit acceptance/rejection; combined response including separator must fit 4,000 Unicode code points, matching class-validator MaxLength. Rejection retains both texts with explanation; success clears only the reviewed transcript. The review editor deliberately accepts overlong text so the clinician can shorten it without silent browser truncation. No audio/provider changes.

## Executed verification (2026-10-22)

- PASS: entire PostgreSQL suite **468/468 tests, 12/12 suites**, 122.421 s. Includes existing isolation, authorization, governance, immutable completion, concurrent start and legacy draft tests. New table-driven direct API cases reject contradictory evidence without mutation/Observation creation; snapshot/note preservation and Unicode backend limits covered.
- PASS: API typecheck and production build; web production build and typecheck after final source edit.
- PASS: expanded `node scripts/design/check-session-workflow.mjs`, responsive DOM at **320/390/768/1024/1440**, existing R1–R5 checks retained. Includes draft/completion timeout replay, cross-operation blocking, accepted completion with lost response, 422 → draft, already-completed 409 recovery, disabled controls/duplicate conflicting clicks during save, explicit clearing confirmation/cancel, transcript empty/combined/exact limit/one over/very long/Arabic/accented/emoji, retained rejection text, no repeated insertion and save/reload. Expected injected timeout/422/403/409 diagnostics are not app crashes.
- PASS: `node scripts/design/check-session-live.mjs` against real Nest/Fastify and isolated PostgreSQL: login → assigned synthetic child → start → activity evidence → reviewed synthetic transcript → autosave → reload → complete → reload read-only. No API mocking in this journey.
- PASS: original 15-migration baseline with a synthetic legacy note → current 16-migration chain. SQL result: `Synthetic legacy retained|IN_PROGRESS|DRAFT|t` (actual start remains null). Separate upgrade database reports schema up to date.
- PASS: `git diff --check`; redacted Gitleaks tracked-export scan performed before commit (including this report and handover updates).
- BLOCKED: Docker daemon access: `permission denied ... unix:///var/run/docker.sock`.
- UNVERIFIED: hosted exact-head test/secret-scan/compose statuses. GitHub CLI is unauthenticated; managed Git supports push but not Actions inspection. Review comment URLs could not be fetched through authenticated CLI; the owner-provided findings were used.
- NOT RUN: separate old-source mutation/red-green execution, exhaustive browser interleaving/state-space testing, Safari/Firefox or physical devices. New API/browser assertions target the previously defective behavior; no existing assertions were removed or weakened.

## Reproduce

Use Node 20 / Yarn 1.22, `yarn install --frozen-lockfile`, `yarn workspace @therabridge/api prisma generate`; set DATABASE_URL to a dedicated synthetic `*_test` database; migrate deploy; run API typecheck/test/build and web build/typecheck. Install existing pinned Playwright Chromium; start the built web app on port 3000, then run `node scripts/design/check-session-workflow.mjs`. The live script requires the documented synthetic seed and an assigned synthetic child/activity, plus same-origin API proxy. Secrets/seed credentials are never part of evidence exports.

Private raw logs are in `.workspace/final-review/` (not committed). Exact candidate SHA and verified remote/PR references are supplied in the final export handoff; a containing commit cannot embed its own SHA. ChatGPT primary independent review and exact-head hosted checks remain the merge gate. No self-approval.
