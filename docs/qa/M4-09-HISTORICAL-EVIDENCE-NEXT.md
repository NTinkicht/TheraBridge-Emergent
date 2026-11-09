# M4-09 — Historic issue evidence reconciliation (next ordered checkpoint)

**Status: implemented reconciliation slice — initial CI/independent review pending; full M4-09 acceptance NOT COMPLETE.**

Parent [M4-09 #183](https://github.com/NTinkicht/TheraBridge-Emergent/issues/183), epic [M4 #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167). Predecessor M4-08 [PR #306](https://github.com/NTinkicht/TheraBridge-Emergent/pull/306) merged as `5a5e4dfc262c1f8df8ac897e8180209cf91feb45`.

## Reuse existing evidence (do not duplicate)
- Frozen 75-entry register, validators and negative tests were delivered in #276, #282, #290, #293; the evidence reconciliation tranche #298 merged and already disposed 18 original issues with verified receipts. The last recorded frozen register checkpoint was **19 VERIFIED_IMPLEMENTED, 50 PENDING_EVIDENCE, 5 PARTIAL, 1 POLICY_BLOCKED**. Recalculate state from current branch before reporting counts as current.
- Never automatically close currently open issues because a similarly titled PR merged or a source file exists. Review source, exact merged commit/CI, test path and reviewer disposition per issue, separately from M4 acceptance.
- Preserve prior fixed scope/partial descriptions for #35 and other clinical policy blockers. Do not reopen already closed original scoped issues or rewrite historical evidence.

## Proposed implementation
1. Verify all 75 frozen issue references and actual GitHub issue/PR states, with exact merge ancestry and current source/test evidence (not source-string proxies). Reconcile any stale count in the canonical CSV without losing original evidence provenance.
2. Work in small evidence-backed batches, prioritizing 50 pending entries. Each disposition must name original issue, scope, current code/test location, merged SHA, six-job final-head CI receipt, reviewer outcome, and next action, or explicitly mark `PENDING_EVIDENCE`/`PARTIAL`/`POLICY_BLOCKED`. Do not fabricate missing checks.
3. Add validator regressions for missing SHA, stale/duplicate issue identity, incorrect status transitions, closed issue with unresolved acceptance, and incorrect policy-gate promotion.
4. Reconcile corresponding canonical requirements and work-log references without bulk issue closure. Keep the 1,023-step workflow acceptance and protected hosted ten-account QA separate.
5. Run six exact-final-HEAD CI jobs, obtain independent Codex review, explicitly dispose all reviewer feedback, and merge only under AGENTS.md Rule 16.

**Safety:** synthetic only; all G2/G2b governance, consent/signing/release/safeguarding/AI/STT remain NO-GO. M4-02, M4-06, M4-07 and M4-08 remain open for their specific quantitative/hosted gaps even if historical source fixes are independently verified.

**Exit:** No evidence row may be promoted simply by similarity or open/closed status. No new real-patient workflows, hosted account mutations or unsigned policy changes in this checkpoint.

## 2026-11-09 executed GitHub source-state reconciliation (PR #307)
- Enumerated all accessible repository issue pages, excluding pull requests; matched **all 75 frozen historical issue identities**, no missing issue.
- Recorded raw issue identity, state, closed timestamp and update timestamp in `docs/roadmap/M4-09-LIVE-ISSUE-STATE-SNAPSHOT.csv`; frozen **as of 2026-11-09**, NOT a continuously updated live-source mirror.
- Actual state at capture: **55 OPEN, 20 CLOSED**. The canonical disposition register contained 19 verified, 50 pending, 5 partial and 1 unsigned-policy blocked.
- The sole contradiction was **#114**, CLOSED in GitHub but PENDING_EVIDENCE in CSV. Confirmed merged PR #145 `447d31ec7265fe0b86fcfc282f558be2823a2552`; all six jobs SUCCESS in CI run `41243219269`; original issue's scoped independent reviewer closeout and real two-session synthetic Chromium script `scripts/design/check-handover-sessions.mjs`. Promoted ONLY #114 to verified; no clinical/hosted acceptance granted.
- Updated canonical register: **20 VERIFIED_IMPLEMENTED / 49 PENDING_EVIDENCE / 5 PARTIAL / 1 POLICY_BLOCKED**; all 20 verified source issues are CLOSED. Remaining 55 open issues are not bulk closed.
- Added `scripts/qa/m4-historic-state-reconcile.mjs` and targeted regressions to reject malformed/missing/duplicate issue state rows, impossible timestamps, invalid claims, missing 40-character SHA/test/reviewer, unsanctioned policy promotion, and to surface closed-pending or open-verified discrepancies. CI runs them after canonical 75-row register validation.
- This work validates status and **one additional evidence-backed historical correction**, not proof the 49 pending original defects have been implemented. M4-09 and epic remain OPEN. Refresh the state snapshot with separately verified GitHub state in a future evidence pass, not silently in CI.

## Deferred by actual acceptance boundaries
- 49 historical issues still lack the full issue → merged change → independent review → exact-head CI → test evidence chain. Keep their disposition unchanged; do not treat closed PRs or a source-code filename as accepted fixes.
- 5 partial issues and policy-blocked #35 require their original residual scope, hosted permissions or signed policy; no policy override is justified.
- This PR does not perform external protected 10-account hosted tests, clinical release, real patient flows, or claim 1,023 workflow steps complete.
