# TB-EM-011 validation and independent-review export

2026-10-21. Synthetic data only; clinical activation, real patient use and deployment prohibited. Exact base: `90e474f477a654d47cf934429d2ca03256fd74d2`; branch `freebuff-tb-em-011-governance`; intended **draft** PR target `freebuff-qualification-issue47-20261021`.

| Check | Actual result |
|---|---|
| Complete API suite, real PostgreSQL 16.15 | **441/441 PASS**, 11/11 suites; 408 baseline + 27 governance cases + 6 new-permission matrix cases; no skips |
| API typecheck / production build | PASS / PASS |
| Web typecheck / production build | PASS / PASS; all 37 pages generated |
| Fresh test schema, all 13 migrations | PASS, including final additive governance constraints |
| Playwright Chromium 130 | **28 checks PASS**, zero page errors; real cookie/CSRF authentication and persisted API data |
| Responsive | All 320, 390, 768, 1024, 1440 px: **zero document horizontal overflow** across access review, supervisor review, immutable preview, family practice and family progress (25 screenshots) |
| Browser workflow | Author submit → supervisor comment → return → resubmit → explicit withdrawal → immutable preview; guardian route locks verified |
| Screen states | Loading, server error, Retry and empty state verified with isolated transport fixtures; these fixtures are explicitly separate from the real API workflow |
| Visual inspection | Saved governance mobile/desktop and frozen-preview images inspected; compared with accepted center/therapist references and family screens. No token/logo/theme changes |
| Secrets | Gitleaks 8.30.1, checksum-pinned: all 74 existing Git commits PASS; export-file scan PASS. Runtime credential/cache directories were excluded from the export scan |
| Whitespace | `git diff --check` PASS |
| Docker containers | **NOT RUN**: Docker socket permission denied. GitHub CI must perform independent container checks |
| Canonical private specifications | **UNVERIFIED**: unauthenticated repository API 404; GitHub CLI unauthenticated |
| Production, real users, clinical approvals, real release | **NOT RUN / NOT AUTHORIZED** |

The full Jest log retains pre-existing MaxListeners warnings; no tests or security assertions were disabled to hide them. Production build verification uses Node 20.20.1, Yarn 1.22.22, existing lockfile/dependencies and normal production NODE_ENV. A build attempted with inherited Next development-worker variables failed; rerunning with the normal production environment passed. No source protection was changed to resolve it.

Browser execution initially required the workspace's existing shared-library directory and fontconfig file. The local preview proxy also needed an error handler for a reset development WebSocket; this VM helper is not product code. Final browser run passes against the actual local API and app. The local synthetic fixture links a pre-seeded guardian and creates the therapist assignment via the existing administrator API; no product consent or transfer workflow grants that access.

## Evidence

- [API suite](api-tests.log), [migrations](migrations.log)
- [API typecheck](api-typecheck.log), [API build](api-build.log)
- [Web typecheck](web-typecheck.log), [web build](web-build.log)
- [Browser results](browser-results.json), [browser acceptance script](../../scripts/qa/tb-em-011-browser.mjs)
- [History secret scan](history-secret-scan.log), [export secret scan](export-secret-scan.log), [container limit](docker-check.log)
- [Supervisor review, desktop](supervisor-review-1440.png), [supervisor review, 390 px](supervisor-review-390.png)
- [Access/consent governance, desktop](access-review-1440.png), [access/consent governance, 390 px](access-review-390.png)
- [Immutable preview, desktop](immutable-preview-1440.png), [immutable preview, 320 px](immutable-preview-320.png)
- [Family practice, 390 px](family-practice-390.png), [family progress, 390 px](family-family-progress-390.png)
- [Exact changed-file list](changed-files.txt), [prepared draft PR description](PR_DESCRIPTION.md)

## Reproduction

Use the committed Node version and Yarn lockfile. Install only if dependencies are absent, then generate Prisma. Point DATABASE_URL at a dedicated `*_test` PostgreSQL database before integration tests; the harness refuses other database names.

```sh
yarn install --frozen-lockfile
yarn workspace @therabridge/api prisma generate
yarn workspace @therabridge/api prisma migrate deploy
yarn workspace @therabridge/api typecheck
yarn workspace @therabridge/api test
yarn workspace @therabridge/api build
yarn workspace @therabridge/web typecheck
NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=/. yarn workspace @therabridge/web build
```

For browser acceptance, start the local HTTPS preview/API as documented by the repository's existing synthetic setup, run the existing synthetic account seed and API build, and use `DEPLOYMENT_ENV=local`, the loopback **development** database URL, and the existing gitignored seed credentials file. Run `node scripts/qa/tb-em-011-browser.mjs`. Origin defaults to `https://localhost:3443` and can be set via `GOVERNANCE_BROWSER_ORIGIN`. This VM additionally uses `.workspace/browser-libs/usr/lib/x86_64-linux-gnu` for LD_LIBRARY_PATH and `.workspace/fonts.conf` for FONTCONFIG_FILE. No credential values are printed or included in these artifacts.

## Remaining gates

D1, D4, D7, D-NEW-3, D-NEW-5 and OR-15/OR-16 remain human decisions. Private SRS/design/architecture/risk/decision registers must be made available for accountable reconciliation. No clinical capability is described as approved. Caseload transfers are simulations only; recipient releases and consent grants remain locked. No merge, auto-merge, clinical activation or deployment occurred.

Independent review and GitHub CI remain pending. Draft PR creation will be attempted after the normal feature-branch push; an unauthenticated CLI cannot create the PR. The complete review body is supplied separately for the user's GitHub connection.
