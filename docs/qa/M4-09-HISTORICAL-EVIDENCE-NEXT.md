# M4-09 — Historic issue evidence reconciliation (next ordered checkpoint)

**Status: planning checkpoint only — NOT IMPLEMENTED, NOT TESTED, NOT ACCEPTED.**

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
