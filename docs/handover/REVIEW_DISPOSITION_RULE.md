# TheraBridge PR reviews — mandatory disposition and qualification

**Status:** Owner-approved standing policy (2026-10-29). Applies to every open and future PR, every reviewer, every work unit. Companion to `AGENTS.md` rules 13–15.

## Rule

No reviewer finding is ignored, including P3, QA suggestions, UX advice, or edge-case tests. Record a decision for each **distinct** comment or grouping of equivalent findings:

| Decision | When | Required evidence |
| --- | --- | --- |
| `FIX_NOW` | Every applicable P0–P2; small, scope-aligned, low-risk P3 | Code/test commit, exact-head CI and reviewer disposition |
| `DEFER_ISSUE` | Non-blocking, larger UX/product expansion or costly low-priority enhancement | Linked GitHub issue with rationale, acceptance criteria, security boundaries and next owner/action |
| `DECLINE_WITH_REASON` | Redundant, contradicted by approved requirements, or disproportionate risk/complexity | Clear rationale and reference to existing behavior/test/decision |

Do not label tenant isolation, authorization, data loss, security or clinical-governance defects "P3" to bypass fixing them. Only a non-blocking suggestion may be deferred; P0–P2 remain mandatory to remediate or explicitly demonstrate to be a false positive with evidence and independent review.

## Required PR workflow

1. Inventory **all** top-level and inline review comments, including drafts and new comments after a re-review. Deduplicate equivalent findings.
2. Attach a disposition to every finding using issue/PR comment links; differentiate implemented code from unverified fixes.
3. Batch safe P3 fixes and add focused regression tests before the final independent review.
4. Create a GitHub issue for each deferred improvement (or a well-defined issue covering related suggestions). Record why it is safe to defer and what would change its priority.
5. Run required exact-HEAD CI jobs: `test`, `secret-scan`, `live-session`, `preview-container`, `demo-journey`, `compose`. Update QA records; never infer new-HEAD success from a previous SHA.
6. Credit-conscious Codex: one request only after stable green CI where possible. Check pending/completed exact-SHA/base requests; no per-push review spam. If the owner orders a follow-on change while Codex is running, code the change, mark old review SHA outdated, and only re-request on the final stable SHA if still needed.
7. Verify no blocking P0–P2 comments, unresolved critical threads, mandatory missing approval, or red/incomplete CI before owner-authorized merge. Clinical deployment still requires signed governance decisions independently of CI.

## Disposition log for PR #111

| Source | Finding | Decision | Evidence |
| --- | --- | --- | --- |
| Independent review (2026-10-28) | Duplicate proposal remains clickable despite existing active source/service proposal (P3 UX) | `FIX_NOW` | Manager panel guard and explanatory state in this PR; API still enforces 409 |
| Independent review (2026-10-28) | Concurrent cancel vs acknowledgement under PostgreSQL center lock not covered (P3 regression) | `FIX_NOW` | Deterministic lock-wait regression in this PR |
| Independent review (2026-10-28) | Older cancelled child-specific history unavailable after 100 other center cancellations (P3 history/product) | `DEFER_ISSUE` | [#112](https://github.com/NTinkicht/TheraBridge-Emergent/issues/112); all active requests remain visible |
| Prior P0–P2 reviews | CHECK constraint, tenant/CAS, revocation, history visibility | `FIX_NOW` | Corrected in e7caba017fac with 6/6 original exact-head CI; new-HEAD CI required again |
| Codex manual review | In progress when owner approved this policy | `PENDING` | Existing request on e7caba017fac; that review cannot qualify subsequent commits |

Mark any new reviewer findings explicitly before the final merge decision.
