# TB-EM-028 — Private hosted browser qualification infrastructure (#81)

**State: implementation PR; NOT hosted acceptance.** This does not rewrite issue #61's official 104-case ledger (**53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED**, plus four historical supplemental PASS). The external Work attempt had 42 **BLOCKED preconditions** and completed zero new viewport/cookie assertions. The fixed synthetic target remains `https://therabridge-ahmed-synthetic-demo.onrender.com`, LIVE Render SHA `8aef22eec134306152a8d3dee1e390913c80c138` at the time of that attempt.

## Why this separate workflow

The browser on Work could not be installed (truncated ZIP) and credentials were unavailable. `.github/workflows/hosted-responsive-private.yml` uses Microsoft's **version-matched preinstalled** Playwright Chromium container `mcr.microsoft.com/playwright:v1.48.2-noble` so no browser download occurs during an external hosted run. It installs the repository's locked Playwright JavaScript dependency. The hosted runner's **real** viewport sizes are 320, 390, 768, 1024, and 1440 CSS px (900px high). All seven roles use separate browser contexts.

This hosted workflow is **workflow_dispatch only**, and its job runs **only on main** after a positive `synthetic_only_authorized` checkbox. There are **no** PR/push triggered access to real hosted QA secrets. It must also pass any protection rules applied to the `hosted-responsive-private` GitHub Actions environment. Restrict environment deployments to `main`, require approved reviewers and limit who may dispatch. No clinical writes or deployment are performed; login/logout are the only intended mutations.

## Owner setup before the FIRST hosted run (manual and private)

1. In GitHub repo **Settings → Environments**, create `hosted-responsive-private`, restrict it to `main`, and require appropriate reviewers. Do not put a private password into Issues, PRs, Actions inputs, files under the repository or chatbot messages.
2. Add **environment secrets** (not repository source files):
   - `TB_HOSTED_QA_USERS_JSON`: a single JSON object containing exactly `platform`, `admin`, `coordinator`, `speech`, `ot`, `supervisor`, `guardian`. Each has an approved fictional `email` and private `password`. The seven emails must be distinct. Only the approved hosted synthetic accounts may be used.
   - `TB_HOSTED_QA_EVIDENCE_KEY_HEX`: a fresh **64-hex-character** cryptographically random AES-256 key. Generate locally with `openssl rand -hex 32` and save it in a private password vault; keep an owner-controlled copy OFF GitHub for decrypting artifacts. Never log it or put it into a PR.
3. Independently check **Render's actual LIVE deployment SHA** using the Render control plane. The manually supplied `deployed_sha` input and runner's `claimedDeploymentSha` are **not independent proof**.
4. On **Actions → hosted-responsive-private → Run workflow**, choose **main**, enter that 40-character SHA, and tick `synthetic_only_authorized`. If the secret-bearing environment is not protected, do not run.
5. The preflight checks the exact seven-role JSON, secure key, SHA syntax, and public `/api/health` JSON response including database availability. A Render loading interstitial is **not** counted as a pass. Failure stops before authentication.
6. The existing `scripts/qa/hosted-readonly.mjs` logs into each fictional account and checks cookie flags, viewport geometry, route navigation, focus, screenshot hashes, and attempts session cleanup. It **deliberately keeps viewport results BLOCKED** until an authorized human independently reviews the screenshots, dialogs, contrast, keyboard accessibility and role boundaries. Do not convert geometry PASS into full 104-case PASS.
7. Before `actions/upload-artifact`, the entire evidence **directory only** is tarred and encrypted with AES-256-GCM (`TBQA1` + random 12-byte nonce + ciphertext + 16-byte auth tag). The uploaded artifact contains **only encrypted ciphertext**, not credentials, raw cookies or unencrypted screenshots. The archive and credential file are removed in the cleanup step. No third-party artifact review service should receive the plaintext.
8. Artifact retention is **7 days**. An authorized custodian must download and privately preserve the encrypted artifact plus corresponding off-site key before expiry. GitHub artifact retention by itself is **not** permanent record storage. To decrypt outside GitHub, export `TB_QA_EVIDENCE_KEY_HEX` privately, then run:
   `node scripts/qa/evidence-crypto.mjs decrypt input.tbqa evidence.tar.gz`
   and privately extract the tar. Failed authentication deletes the attempted decrypted file; do not upload decrypted evidence publicly.
9. Examine all 35 role-width screenshot sets, cookie attribute receipts (not cookie values), role isolation, route access, dialog and focus tests. Record independently verified deployment identity, screenshots and case-by-case PASS/FAIL/BLOCKED/NOT TESTED provenance in **issue #61**, without changing unrelated historical records. The original hosted deployment is older than current `main`; don't attribute newer features to it.

**Expected CI status:** the collector currently returns nonzero for BLOCKED visual/dialog acceptance, so this manual workflow may appear red despite successfully uploading encrypted evidence. That means **INCOMPLETE**, not automatically a product defect. Read the encrypted receipt before interpreting failures. Never record a PASS without the visual/manual gate.

## Offline qualification

`node --test scripts/qa/hosted-readonly.test.mjs scripts/qa/private-runner.test.mjs`

On every QA source change `qa-readonly-contracts` runs these tests without secrets or external requests. They verify role validation, target gating, cookie inspection, blocking behavior, authenticated ciphertext, tamper detection and safe failure. **These tests do not constitute hosted acceptance.**

## Current decisions not covered

This does not enable clinical signing, approval, consent, report release, safeguarding, family messaging, speech-to-text or AI assistance. Nor does it settle archived-child review disposition (#80), production/pilot readiness or 104-case acceptance (#61). Missing or expired private credentials and environment protection require operator action; they cannot be synthesized by CI.
