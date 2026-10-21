# TB-EM-011 — independent qualification and controlled integration

**Created:** 2026-10-21. **Status:** TECHNICAL CANDIDATE ONLY / unsigned clinical and production gates. **Do not merge or deploy this draft PR without authorization.**

## Provenance and review order

| Stage | GitHub PR | Exact source head |
|---|---|---|
| Foundation | `phase-1-center-foundation` | `8eb8f893b6e23cde6cb5ccc21e70f17177750785` |
| Mobile family navigation | #48 | `7d5e05113a0200f6b6cd0fb412550ef3c26f208c` |
| Guardian revocation / replay protection | #49 | `90e474f477a654d47cf934429d2ca03256fd74d2` |
| Synthetic non-authorizing governance | #50 | `b275f1b0e201d622bce1336a67d2d74f511fb2d4` |
| CI repair only (superseded by #53) | #52 | `5ee3b7d793d05fe80d8e1a9726a39357f93238cf` |
| Service isolation + demo-gate + CI | #53 | `cd5f721d9e4d68f756baa4109628c44f217c706a` |

The candidate source is **six commits ahead** of the unmerged phase-1 foundation and contains those accepted-review *candidates* transitively. No separate cherry-pick or merge of #52 is needed because its two CI changes are already in #53. PRs #48, #49, #50 and #53 remain reviewable and unmerged.

## Independent check of source-head evidence

- Exact-head [CI run 39652806343](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39652806343): PASS test / secret-scan / compose.
- Exact-head [CI run 39652813269](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39652813269): PASS test / secret-scan / compose.
- **442 of 442** PostgreSQL API tests / 11 suites passed, with typecheck and API + web production builds.
- Docker image build, containers healthy, API/web smoke checks passed.
- Authored browser evidence includes TB-EM-011 28 interaction checks and 25 viewport screenshots; **not independently rerun in an authenticated browser**.

## Import controls

The existing `main` branch at `b951f1c6d04ed465f1c990a997b5dbcbe51dfe0c` has **unrelated Git history**; do not git-merge export branch. This draft import candidate references exact already-published file blobs in the same repo, preserving the unrelated main history. Only allow-listed `apps/`, `assets/`, `scripts/`, `docs/emergent/`, `artifacts/evaluation/`, `artifacts/tb-em-011/`, CI/build/lock/env templates and gitleaks configuration were copied. Main's `README.md`, `AGENTS.md`, `docs/product/` and original handover files were preserved. Temporary Emergent `backend/`, `frontend/`, `.emergent/`, machine-local files and hidden session/credentials were excluded.

The original import helper omitted `.gitleaks.toml`, `.gitleaksignore` and `artifacts/*`, even though CI executes gitleaks using the config. Its allowlist is corrected **in this import candidate**, not in the protected/unchanged source branch. The imported `README.emergent.md` was updated here to remove outdated "no product features" claims. None of these two integration-only documentation changes modifies application runtime.

A byte-SHA comparison found **zero differing-path collisions with main** for the selected source paths; identical shared assets are retained.

## Remaining acceptance gates

1. **Run the imported branch's own** GitHub CI and verify pinned exact commit. No passing source-head CI can substitute.
2. Obtain separate review for the ChatGPT-authored #53 patch; automation checks are objective evidence but not independent human/security sign-off.
3. Keep GitHub issues #35 (unsigned D-NEW-5 safeguarding) and #51 (specialty visibility until integration verified) OPEN. Confirm permitted behavior for multiple concurrent specialties, clinical supervisory roles, custody/consent.
4. Reconcile with **private** `NTinkicht/TheraBridge` controlled specifications without publishing their contents. Gate decisions D1, D4, D7, D-NEW-3, D-NEW-5, OR-15 and OR-16 remain unsigned.
5. Owner authorization required for merge of an integration candidate. No clinical, real patient, pilot, production deployment or permission activation follows from code merge.

## Final disposition

**Technical preparation complete pending integrated CI and independent review.**
**Clinical/pilot/production: NO-GO.**
No auto-merge, force-push, branch rewrite, owner clinical decision or deployment authorized.
