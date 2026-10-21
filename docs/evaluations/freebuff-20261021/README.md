# Freebuff takeover evaluation — 2026-10-21

**Status: awaiting independent acceptance. Do not begin TB-EM-011.**

Evaluation branch: `freebuff-evaluation-20261021` only. Original baseline: `8eb8f893b6e23cde6cb5ccc21e70f17177750785`.

Functional evaluation commit (unchanged): [`83f1ac9770d537bfa16ad5de82a2067c6aa4bdb5`](https://github.com/NTinkicht/TheraBridge-Emergent/commit/83f1ac9770d537bfa16ad5de82a2067c6aa4bdb5). This follow-up adds documentation only. Evidence stays in its original committed location to preserve that commit and avoid duplicating binary assets.

The original report's statement “No ... push” describes the initial evaluation checkpoint; the owner subsequently authorized a normal fast-forward push of the evaluation branch for this handover. No merge, force-push, deployment, or main/phase-1-center-foundation changes are authorized.

## Review materials

- [Full evaluation report and limitations](../../../artifacts/evaluation/REPORT.md)
- [Repeatable Playwright regression script](../../../scripts/design/check-family-navigation.mjs)
- [Baseline measurements](../../../artifacts/evaluation/before/results.json)
- [Final measurements](../../../artifacts/evaluation/after/results.json)
- [Pixel-comparison summary](../../../artifacts/evaluation/visual-comparison.txt)
- [Exact final changed-file list relative to the baseline](changed-files.txt)

### Practice navigation before / after

| Viewport | Before | After |
|---|---|---|
| 320px | [PNG](../../../artifacts/evaluation/before/practice-320.png) | [PNG](../../../artifacts/evaluation/after/practice-320.png) |
| 390px | [PNG](../../../artifacts/evaluation/before/practice-390.png) | [PNG](../../../artifacts/evaluation/after/practice-390.png) |
| 768px | [PNG](../../../artifacts/evaluation/before/practice-768.png) | [PNG](../../../artifacts/evaluation/after/practice-768.png) |

The [before directory](../../../artifacts/evaluation/before/) and [after directory](../../../artifacts/evaluation/after/) also contain Progress and family light/dark design-preview images at all three widths. The after directory includes three long-label/multiple-context stress screenshots. No patients or credentials are present in these artifacts.

## Exact verification commands used

Commands were run from the repository root in Bash with workspace-local Node **20.20.1**, Yarn **1.22.22**, and PostgreSQL **16.15**. The local PostgreSQL cluster listened only on `127.0.0.1:55432`. The URL below points at a disposable, isolated synthetic database, not production; the test harness requires the `_test` suffix. These commands require a running PostgreSQL instance and installed dependencies; this handover does not promise that archived runtime processes survive.

### Dependency installation and database preparation

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH"
yarn install --frozen-lockfile
export DATABASE_URL='postgresql://therabridge@127.0.0.1:55432/therabridge_test?schema=public'
yarn workspace @therabridge/api prisma generate
yarn workspace @therabridge/api prisma migrate deploy
```

### Baseline API tests and builds

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH"
export DATABASE_URL='postgresql://therabridge@127.0.0.1:55432/therabridge_test?schema=public'
yarn workspace @therabridge/api test > .workspace/evidence/api-baseline.log 2>&1
# 10 suites; 399/399 passed; Jest time 74.677 seconds.
yarn workspace @therabridge/api typecheck > .workspace/evidence/typecheck-api-baseline.log 2>&1
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 yarn build > .workspace/evidence/build-baseline.log 2>&1
```

### Final tests and typechecks

The executed chain retained the tested commands' exit status; output was not piped through an output filter:

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH"
export DATABASE_URL='postgresql://therabridge@127.0.0.1:55432/therabridge_test?schema=public'
yarn workspace @therabridge/api typecheck > .workspace/evidence/typecheck-api-final.log 2>&1 && yarn workspace @therabridge/web typecheck > .workspace/evidence/typecheck-web-final.log 2>&1 && yarn workspace @therabridge/api test > .workspace/evidence/api-final.log 2>&1
rc=$?
tail -16 .workspace/evidence/api-final.log
exit $rc
```

Result: both explicit typechecks passed; **10 suites, 399/399 API tests passed**; Jest time **76.164 seconds**. No tests were disabled or assertions weakened. Existing MaxListenersExceededWarning was not suppressed.

### Final production builds

The root `build` script runs `nest build` followed by `next build` through the existing Yarn workspaces. The original combined build invocation contained an accidental trailing space in the API-base value:

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH"
NEXT_PUBLIC_API_BASE_URL='/. ' yarn build > .workspace/evidence/build-final.log 2>&1
rc=$?
tail -10 .workspace/evidence/build-final.log
exit $rc
```

Both builds exited successfully, but that environment typo is not considered a valid runtime configuration. The web production build was then rerun with the corrected same-origin value before final browser verification:

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH"
NEXT_PUBLIC_API_BASE_URL='/.' yarn workspace @therabridge/web build > .workspace/evidence/build-web-final.log 2>&1
rc=$?
tail -8 .workspace/evidence/build-web-final.log
exit $rc
```

Result: Nest production build passed; corrected Next production build passed. No source changes occurred between those builds and final browser verification.

### Final browser regression

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH" LD_LIBRARY_PATH="$PWD/.workspace/browser-libs/usr/lib/x86_64-linux-gnu" FONTCONFIG_FILE="$PWD/.workspace/fonts.conf"
SCREENSHOT_BASE_URL=https://localhost:3443 NAV_SESSION_FILE=.workspace/browser-session.json node scripts/design/check-family-navigation.mjs > .workspace/evidence/navigation-final.log 2>&1
rc=$?
cat .workspace/evidence/navigation-final.log
git diff --check
exit $rc
```

The script passed direct loads, navigation, selected-link visibility, keyboard focus, resizing, and affected-page horizontal-overflow checks; it captured 12 standard and 3 stress screenshots. It uses the existing Playwright dependency. Workspace browser libraries/font configuration were needed because system packages could not be installed. On a normally provisioned machine, use the project Playwright installation with its supported Chromium/system dependencies instead.

`NAV_SESSION_FILE` must be a private Playwright storage-state file obtained by signing in as a seeded synthetic guardian. The local HTTPS ingress on 3443 preserves Secure cookies; no authentication checks were disabled. The private session file, local TLS key, generated passwords, database files and runtime logs are deliberately not committed. Use `NAV_SCREENSHOT_DIR=.workspace/review-screenshots` to avoid overwriting accepted evidence on a repeat run. The local proxy/TLS helpers are workspace-only, so reviewers must provide their own equivalent same-origin HTTPS ingress; the script is repeatable but not a turnkey clean-machine bootstrap.

## Limitations and acceptance boundary

- Docker client access was denied at its socket; Compose and the known PR #12 smoke assertion were not run or modified.
- This was a focused source review, not an exhaustive line-by-line audit.
- Synthetic account seed does not populate child workflows. Authenticated Practice evidence shows its honest empty state.
- Longer German labels and multiple workspace choices are browser-only stress fixtures, not proof of real multi-guardian onboarding or live role reassignment.
- VM-local HTTPS browser verification passed; the owner's authenticated external preview session remains unverified.
- Visual coverage is limited to the recorded screens. Date/greeting-dependent preview differences are documented, not represented as pixel-identical.
- No functional changes are included in this documentation follow-up. Clinical locks, permissions, safeguarding, branding, architecture, schemas and dependency lockfile remain unchanged.

Wait for independent acceptance before proceeding.
