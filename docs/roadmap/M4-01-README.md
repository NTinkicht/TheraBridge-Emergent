# M4-01 — Canonical baseline reconciliation (review-ready inventory, **NOT** feature sign-off)

**Work item:** [#175](https://github.com/NTinkicht/TheraBridge-Emergent/issues/175) · **Roadmap:** [M4 epic #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167)
**Snapshot:** 2026-11-07 · **Previous milestones:** M1/M2/M3 remain **owner-closed**.
**Repository baseline:** `main` at branch creation; use PR exact-head CI for final qualification.

## Delivered inventories

| Artifact | Rows | Authority and intended use |
|---|---:|---|
| [66-feature crosswalk](M4-01-66-FEATURE-CROSSWALK.csv) | 66 | Original 2026-11-01 *Complete Remaining Feature Roadmap*, mapped by original numbered feature to a new M4–M11 issue ID |
| [91 V1 workflows](M4-01-91-WORKFLOW-REGISTER.csv) | 91 | Owner's `TheraBridge_V1_Complete_Remaining_Roadmap_2026-10-22.xlsx`, sheet “91 V1 Workflows”; includes `WF-X6` explicitly **V2 EXCLUDED** |
| [55 owner requirements](M4-01-55-OWNER-REQUIREMENTS.csv) | 55 | Same workbook, sheet “55 Owner Requirements”; IDs `OB-01` through `OB-55` |
| [Historical open issue snapshot](M4-01-OPEN-ISSUE-SNAPSHOT.md) | 75 | GitHub open issues created before 2026-11-07; excludes the 98 new M4–M11 issues |

These files are ***traceability scaffolds***: their default `PENDING_VERIFICATION` statuses do **not** claim a working feature is missing, failing, approved, or tested. The `new_work_unit` column identifies a concrete provisional delivery owner in M4–M11; it is not yet a complete many-to-many requirement/implementation proof. Safety-critical requirements are routed to implementation or policy units, never M4-01. Feature #39 and WF-X6 are V2-deferred pending signed owner re-scope. All historical issue states need an evidence-based source review.

## What was reconciled so far

1. **M1–M3 preserved.** Existing merged implementations are assumed closed administratively, not re-opened because an October 22 or November 1 source spreadsheet says “missing”.
2. **Feature coverage.** All 66 original numbered capabilities (10 clinical, 10 report/home plan/AI, 8 session, 12 family, 10 admin, 8 scheduling, 8 governance) have concrete delivery owners except #39, intentionally marked `V2-DEFERRED` in agreement with `WF-X6`.
3. **Workflow scope.** All 91 source workflow IDs have named work-unit owners, except `WF-X6`, which remains `V2-DEFERRED`. The previous 1023 workflow steps remain **not individually mapped** until the controlled step-level file is accessible.
4. **Owner requirements.** All 55 `OB-` IDs are preserved and given initial workstream routing. No original requirement was excluded as redundant or assigned to the documentation-only M4-01 unit.
5. **Issue history.** 75 original open GitHub issues indexed without closing any of them; prior GH waves/clinical gates/QA follow-ups are separately identified.
6. **Authority boundary.** Private spec paths `specs/workflow-coverage/workflows.json` and `specs/product/THERABRIDGE_V1_OWNER_FUNCTIONAL_BASELINE_20261020.md` could not be retrieved through this connection. Therefore this PR does not assert a complete controlled spec clause-by-clause audit or owner-policy approval.

## How to finish M4-01 (acceptance evidence for follow-on reconciliation PRs)

For every original row:
- [ ] Confirm current `main` implementation path, service/API, UI route and database model; attach commit/PR evidence.
- [ ] Find exact test IDs and **current** CI/hosted external acceptance evidence (not older-head green jobs).
- [ ] Confirm relevant signed product/clinical/safeguarding/privacy policy; distinguish synthetic design from live approval.
- [ ] Assign one evidence-backed state: `VERIFIED_IMPLEMENTED`, `PARTIAL`, `MISSING`, `POLICY_BLOCKED`, `SUPERSEDED`, `DUPLICATE`, or `V2_EXCLUDED`.
- [ ] Map exact workflow steps (1023 noted in Oct 22 source) and design entrypoints when controlled underlying files are accessible.
- [ ] Link each old issue to current new work-unit(s) and document why old issue can close, remain open, or be marked duplicate.
- [ ] Confirm functional owners and technical reviewers validate the matrix; close #175 only after these evidence tasks.

## Reproduction

```bash
node scripts/qa/check-roadmap-registers.mjs
node --test scripts/qa/check-roadmap-registers.test.mjs
```

Expected: 66 unique features, 91 unique controlled workflows, 55 consecutive owner requirements; valid implementing owners, no false `VERIFIED_IMPLEMENTED` status without acceptance evidence, and both feature #39 / `WF-X6` remain V2 excluded. This validates register **structure only**, not implementation or compliance.

## Clinical/production boundaries

No modifications to authentication, role grants, clinical data, protected document release, speech-to-text, external AI or deployment configuration. Keep G2/G2b and other unsigned gates fail-closed; use fictional synthetic records only. Reviewer may qualify this **documentation/inventory PR** without claiming release readiness.
