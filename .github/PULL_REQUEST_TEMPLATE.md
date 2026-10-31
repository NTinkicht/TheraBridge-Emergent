## Work unit / scope

Work-unit ID:
Goal:
Synthetic or clinical boundary:
Explicitly excluded:

## Test and merge qualification

- [ ] Exact final HEAD SHA and six required CI job results recorded
- [ ] All P0–P2 findings fixed, or objectively disproven and independently checked
- [ ] No unresolved blocking review threads or policy gates
- [ ] Clinical governance NO-GO unchanged unless owner-signed authorization explicitly documented
- [ ] Standing owner-authorized autonomous merge gate (AGENTS.md Rule 16) satisfied; otherwise explicit owner decision recorded

## Required review findings disposition (AGENTS.md §13–15)

For **every** review finding, including P3 and edge-case suggestions, choose one:

| Reviewer/comment link | Severity | FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON | Evidence (commit / issue / rationale) |
| --- | --- | --- | --- |
|  |  |  |  |

- [ ] All newly arrived comments inventoried after re-review
- [ ] Worthwhile low-risk P3s fixed in this PR
- [ ] Larger non-blocking items deferred to traceable GitHub issues with priority, acceptance criteria, responsible owner/next action and safety rationale
- [ ] Declined suggestions have a technical reason
- [ ] Single credit-conscious Codex request on stable green HEAD (or documented exception)
- [ ] Reviews cover the exact final SHA; outdated reviews are not counted as final qualification

- [ ] All six exact-HEAD jobs green, final-head independent review completed, all reviewer comments dispositioned, and PR ready/mergeable before autonomous merge
- [ ] No separately owner-gated clinical, consent/release, production or historical-migration decision is implied

## Evidence

API/PostgreSQL:
Web/UX:
CI SHA and jobs:
Known limitations:
Deferred GitHub issues:
