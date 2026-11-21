# TheraBridge Smart CI — risk-based execution policy

**Status:** implemented in shadow mode with a **hard-coded Rule 16 owner-policy lock**. Setting the CI mode variables alone cannot activate targeted execution. This is CI optimization, **not** M4 release/clinical acceptance. No required status check may be removed or bypassed.

## Design

`ci.yml` retains all six existing jobs: `secret-scan`, `test`, `live-session`, `demo-journey`, `compose`, `preview-container`. Added `smart-plan`, `smart-targeted` and **`smart-ci-gate`**. The classifier examines complete, exact PR base/head Git commit trees using `git diff --name-status -z --no-renames`, which treats renames as additions/deletions. Invalid/incomplete Git data, a missing head/base commit, empty or oversized diffs, uncertain file types, fork PRs, non-main targets, branch pushes and unknown rules **all select full CI**.

The policy is deterministic: no model or issue label may skip tests. Rules are tested in `scripts/ci/smart-ci.test.mjs`; status check wiring pinned in `scripts/ci/smart-ci-workflow.test.mjs`.

| Mode | Qualification | Required jobs |
|---|---|---|
| full | Default; any API/TS/TSX logic, auth, tenant/clinical, DB, workflow, dependency, Docker, governance config, deleted Web assets or unknown changes | Existing six, including secret scan; `smart-targeted` skipped |
| docs | Only Markdown/MDX under `docs/` plus root README or CONTRIBUTING; never AGENTS, SECURITY or CODEOWNERS | Secret scan; targeted policy tests and canonical register validators |
| web-style | Only added/modified Web CSS plus non-executable PNG/JPEG/WebP/GIF/ICO/AVIF/font public assets, optionally accompanied by safe docs; SVG/HTML/JS/JSON always full | Secret scan; targeted tests/Web production build; `live-session` and `demo-journey` browser/DB regressions |
 
**Clinical and safety gates:** Any change to auth, RBAC/tenant/specialty, database migrations, clinical report/consent/release/safeguarding, scheduling or API/Web application logic beyond static assets always requires full CI. All G2/G2b, D-NEW-5, real signing/release/AI and patient-data NO-GO remain unchanged. Private ten-account/2-valid-centre acceptance is an independent protected workflow and is never replaced by Smart CI.

## Fail-closed required status verification

The independent `smart-ci-gate` always runs, reads exact `needs` job outcomes from GitHub Actions, and validates that every selected job **actually succeeded** and every unselected job was skipped. Missing/failed/cancelled jobs, unexpected skips, unrecognized modes and a failed classifier fail the gate. GitHub's generic "skipped" UI status is **not** treated as test PASS. The secret scanner always runs independently on full Git history and tracked checkout.

## Activation

1. **Shadow (default).** Leave `TB_SMART_CI_MODE` unset or `shadow`; `TB_SMART_CI_REQUIRED_GATE_READY` unset/false. All six existing jobs continue to run. `smart-plan` publishes an advisory candidate, but execution remains full. Use representative PRs (documentation, Web static assets, API, clinical, DB, workflows, mixed changes) to compare risk predictions to actual full-CI results.
2. **Owner policy prerequisite (separate approval and PR):** AGENTS.md Rule 16 explicitly mandates all six jobs pass on exact HEAD. An owner-approved amendment to Rule 16 must define the legally acceptable targeted mode and grant it equivalent merge-gate status. Until this approved revision merges, production code passes `ownerPolicyApproved:false` and always runs all six jobs, even if repository variables request targeting.
3. **GitHub branch protection prerequisite (manual admin task):** Confirm all protected branches and rulesets. Make the new `smart-ci-gate` **required**, and keep independent review and secret scan enforced; verify all status-check names are exact. Decide how pre-existing six required checks will be interpreted if legitimately skipped. The current GitHub App lacks branch-protection administration, so this step **cannot be automatically verified or changed** from this ChatGPT integration.
4. **Activate carefully:** After the approved Rule 16 amendment has merged, separately change the hard-coded source lock in a tested PR (including specific policy version/evidence) and verify branch protection. Only then Set repo Actions variable `TB_SMART_CI_MODE=targeted` and `TB_SMART_CI_REQUIRED_GATE_READY=true` **only after** the gate is required and shadow classification is reviewed. This is operator opt-in, not a safety bypass; both flags are needed. Roll back instantly by setting mode `shadow` or unsetting either flag. A main-branch push always triggers full CI.
5. **Observe:** For at least a week track each mode, full-vs-selected runner minutes, exact checked head SHA, failed classifier events, new code paths, reviewer dispositions and skipped-job gate receipts. Schedule periodic full CI on main (main pushes remain full), and retain protected hosted QA, rollback/migration, clinical governance approvals independently.

## Invariants / caveats

- No force-push, no changes to application credentials, Render/Neon runtime, or clinical data.
- No runtime-only Web source code or potentially executable Web public SVG/HTML/JS/JSON is selected by the CSS/asset rule; Web UI and API changes default full.
- A new file extension, deleted asset, renamed source, mixed change or edited CI selector/workflow defaults full.
- Shadow-mode CI may be marginally slower due to one small planning job; meaningful savings begin only after branch protection and targeted activation.
- PR status comments or Codex review **do not** substitute for exact-head CI policy gate; no automatic merge.
- The selector emits only safe category/reason/job names, no file contents, secrets or patch text.
