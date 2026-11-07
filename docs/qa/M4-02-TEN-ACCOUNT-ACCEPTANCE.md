# M4-02 — Ten-account hosted synthetic authentication and role-isolation acceptance

**Status:** PLANNING ONLY / NOT IMPLEMENTED / NOT TESTED on this draft branch.
**Roadmap:** [#176](https://github.com/NTinkicht/TheraBridge-Emergent/issues/176), [M4 epic #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167).
**Predecessor:** [M4-01 PR #265](https://github.com/NTinkicht/TheraBridge-Emergent/pull/265) merged at `aa14fb46976a30fd41ec800e1060c3e7f64125f0`.
**Target:** Render hosted synthetic demo; operator-verified deployed SHA mandatory.
**Safety:** Fictional accounts only; no real child records, clinical signing, protected release or external AI/STT.

## Existing test infrastructure (must reuse)
- `scripts/qa/hosted-interactive.mjs`: seven-role non-mutating browser acceptance.
- `scripts/qa/hosted-extra-therapists.mjs`: ABA2/OT2/Speech2 private login, role context and logout.
- `scripts/qa/hosted-readonly.mjs` and `prepare-hosted-run.mjs`: cookie/session safety, SHA-scoped health and private preflight.
- `.github/workflows/hosted-interactive-private.yml`: manual `workflow_dispatch`, requires `deployed_sha` (40-char SHA) and `synthetic_only_authorized=true`, protected `hosted-responsive-private` environment and GitHub secrets `TB_HOSTED_QA_USERS_JSON`, `TB_HOSTED_QA_EXTRA_USERS_JSON`.
- `docs/qa/TB-EM-HOSTED-INTERACTIVE-20261102.md`, `docs/qa/TB-EM-HOSTED-DEMO-REHEARSAL-20261102.md`: historical evidence, not current acceptance.

## Implementation work (not yet completed)
1. **Inspect live code and fixture truth** to map 7 legacy roles + Dalia ABA, Nour OT, Huda Speech into 10 isolated browser contexts; prohibit password logging, screenshots of sensitive content, or cookie/header leaks.
2. **Expand three-therapist acceptance** beyond login/logout with read-only API and UI permission checks: each account sees exactly its assigned center/child/specialty, no other specialist's clinical workspace; deny missing membership, other child, cross-center access; preserve no-write behavior. Prefer known fixture identifiers discovered from authorized session endpoints over fabricated IDs.
3. **Seven-role isolation**: platform admin, center admin, coordinator, speech therapist, OT therapist, clinical supervisor, guardian. Verify authorized landing/route matrix; negative role and specialty paths; coordinator/supervisor no clinical escalation; supervisor no family-message read.
4. **Session lifecycle**: HTTPS redirect/cookie SameSite/Secure/HttpOnly, CSRF and session invalidation, logout, context change, stale cookie, access revocation where synthetic non-mutating tests can safely simulate; mark forbidden mutations BLOCKED rather than trying them against live state.
5. **Private evidence**: run in protected workflow, emit only PASS/FAIL/BLOCKED and sanitized route/status evidence. Tie evidence to *exact verified live Render SHA* and CI/check SHA; never print credentials, tokens, bodies, patient details or unrestricted page captures.
6. **Negative paths and reliability**: missing/wrong extra identity, invalid key set/credential shape, auth reject, wrong assigned role, failed logout, cookie rejection, hosted outage, stale deployed SHA. Test these locally/CI with fully synthetic stubs.
7. **Document approval and failures**: capture actual job URL, required protected-environment human approval, screenshot redaction, evidence integrity, risk findings and separate follow-up issues for any accepted nonblocking deferrals.

## Acceptance matrix (NOT RUN)

| ID | Actor / scope | Acceptance | State |
|---|---|---|---|
| HA-01 | Seven legacy demo users | Valid login + correct landing + logout | NOT RUN |
| HA-02 | Dalia ABA | Login and exactly one ABA therapist role/context | NOT RUN |
| HA-03 | Nour OT | Login and exactly one OT therapist role/context | NOT RUN |
| HA-04 | Huda Speech | Login and exactly one Speech therapist role/context | NOT RUN |
| HA-05 | Three additional therapists | Distinct roles/assignment; unauthorized specialty denied | NOT RUN |
| HA-06 | All 10 | No cross-center/cross-child/cross-guardian escalation | NOT RUN |
| HA-07 | Supervisor / coordinator | No family discussion access; no clinical privilege escalation | NOT RUN |
| HA-08 | All 10 | Secure session cookie, expiry/logout and stale token denial | NOT RUN |
| HA-09 | Workflow and QA | Redacted receipts tied to the operator-verified live SHA | NOT RUN |
| HA-10 | Fail-closed cases | No clinical signing/release, real STT/AI or write side effects | NOT RUN |

## Technical and review gates
- [ ] Review existing scripts for *actual* exported imports and API paths before extending; no guess-based test.
- [ ] Implement focused tests, run locally/synthetic CI; six exact-head jobs green.
- [ ] Execute protected hosted workflow on a confirmed deployed SHA, with appropriate environment approval.
- [ ] Record PASS/FAIL/BLOCKED with precise reasons, investigate all FAIL and session-cleanup anomalies.
- [ ] Independent reviewer on final exact head, all comments dispositioned under AGENTS.md Rule 13–18.
- [ ] Preserve M1–M3 historical accepted code, clinical NO-GO and all 7 existing account passwords.
