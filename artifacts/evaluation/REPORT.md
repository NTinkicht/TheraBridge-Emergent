# TheraBridge Freebuff takeover evaluation

## Scope and branch

Starting commit: `8eb8f893b6e23cde6cb5ccc21e70f17177750785`, confirmed equal to remote `freebuff-evaluation-20261021`. All edits and the evaluation commit are on `freebuff-evaluation-20261021`. No merge, push, deployment, changes to main/phase-1-center-foundation, or clinical permission activation.

## Understanding

TheraBridge is a synthetic pediatric therapy coordination proof of concept, not a clinically deployable product. Next.js 14/React 18/TypeScript/Tailwind provide the UI; NestJS 10/Fastify owns business logic; Prisma 5.22 and PostgreSQL own persistence. Emergent's Python/frontend shims are not the application architecture. Normal ingress routes `/api/*` to Nest and other requests to Next.

Implemented workflows span applications/provisioning, invitations and staff onboarding, trials, children and guardian links, assigned-provider scheduling with DST-aware recurrence, recipient-specific operational messaging, clinical drafts/review, recorded-observation charts, report drafts/versioning, and sample family practice with fixed-choice idempotent outcomes. Family practice is separate from clinical evidence. Guardian progress is a fixed sample, not a released report.

Security boundaries include deny-by-default route permissions, revalidated active tenant/role context, child/provider/guardian row scope, session rotation, session-bound CSRF, Origin validation, database-backed rate limiting, trial write guards, append-only history, and clinical status/release database restrictions. Signing, cosigning, final approval, release, recording and safeguarding capabilities remain denied. Neither demo-recording nor messaging feature flags were enabled for the running preview.

The accepted visual baseline is **Calm Precision, with warmth at home**. The existing logo assets, Plus Jakarta Sans headings, IBM Plex Sans body, tokens, palette, family light/dark themes, component kit, spacing and breakpoints were preserved. No screens or design system were recreated.

Reviewed source inventory, architecture/operations/security docs, design direction/tokens/generated guidelines, work-unit specifications 001–010, handover material, clinical services/guards/policy/migrations, authenticated navigation and relevant screens, CI and test harnesses. Inspected reference family screenshots and captured current before/after screens. This is a focused takeover review, **not a line-by-line audit of every source file or every workflow**. Some early README/architecture/handover sections describe TB-EM-000/001 and are stale; later work units and executable source are the better current reference.

## Running and compatibility

- Installed Node **20.20.1**, Yarn **1.22.22** inside `.workspace`; frozen-lockfile install succeeded; lockfile unchanged.
- Docker client exists but socket access is denied. Docker Compose and PR #12 smoke assertion were **not run or modified**.
- Extracted PostgreSQL **16.15** packages into `.workspace` without root/system changes. Dedicated loopback cluster on 55432; separate `therabridge` and guarded `therabridge_test` databases.
- All **12 migrations** deployed to both databases; latest `20261027090000_tb_em_010_practice_outcomes`.
- Existing seed generated **10 synthetic accounts**, with disposable random credentials only in ignored mode-0600 storage.
- API health confirms PostgreSQL and migrations. Web, API and database run together; browser login with the seeded guardian succeeded over a local HTTPS ingress, preserving Secure/HttpOnly cookies and CSRF.
- Same-origin proxy and TLS test ingress are untracked workspace helpers, not product architecture changes. Port 3000 preview opened in Browser panel; API/database remain loopback. Preview's interactive owner-authenticated browser session was not verified; VM headless access to the externally authenticated preview hostname could not use that session. Local HTTPS Playwright tests did work.

## Tests

| Check | Baseline | Final |
|---|---|---|
| API Jest + real PostgreSQL | 10 suites, **399/399 PASS** (74.677s) | 10 suites, **399/399 PASS** (76.164s) |
| API typecheck | PASS | PASS |
| Web typecheck | Next build type validation PASS | Explicit tsc PASS |
| Nest production build | PASS | PASS |
| Next production build | PASS | PASS |
| Navigation browser checks | Defect reproduced (Practice x=323..423 at 320px) | PASS |
| Docker Compose | BLOCKED | BLOCKED |

The existing API suite emits a MaxListenersExceededWarning; no suppression or assertion changes were made. One final build command initially used a mistyped API-base environment value; the web build was rerun successfully with the correct same-origin value `/.` before final browser checks.

## Issue #45 implementation

Reused `ScrollStrip`, including its existing token-based fades and 44px chevrons. Added opt-in active-link reveal with container/child resize observation and keyboard-focus reveal. ProductShell supplies an identity reflecting route, permitted links and context count. Only the horizontal strip scrolls; it does not move the document or hidden desktop navigation. Existing global focus styling remains. Reduced-motion users get non-smooth strip scrolling.

Automated Playwright runner: `scripts/design/check-family-navigation.mjs`. Requires an existing private synthetic guardian storage-state file; it never seeds credentials or grants permissions. Example:

```sh
SCREENSHOT_BASE_URL=https://localhost:3443 \
NAV_SESSION_FILE=.workspace/browser-session.json \
node scripts/design/check-family-navigation.mjs
```

Verified direct Practice/Progress loads, link navigation, keyboard Tab/focus visibility, overflow cues, zero document overflow and desktop-to-phone resizing at **320, 390, 768px**. Additional browser-only session-response fixture adds a workspace choice, with German-length labels to stress resizing; this is **not** an end-to-end test of real multiple guardian links, role reassignment or a shipped localization system. Those remain follow-up validation gaps.

## Screenshots / visual comparison

`before/` contains 12 baseline PNGs and measurement JSON. `after/` contains the matching 12 PNGs, three long-label/multiple-context stress PNGs and measurement JSON. Practice and Progress main content below navigation compare pixel-identically at all three widths. Desktop sidebar/navigation styling is unchanged; transient hover states can affect individual links. Light/dark design previews were also captured. Clock-dependent greetings/dates cause bounded image differences, so these are not asserted as whole-image pixel-identical. No layout or theme regression was observed in the inspected screenshots; this is not exhaustive visual coverage of every screen/browser.

| Width | Before | After |
|---|---|---|
| 320 | [Practice](before/practice-320.png) | [Practice](after/practice-320.png) |
| 390 | [Practice](before/practice-390.png) | [Practice](after/practice-390.png) |
| 768 | [Practice](before/practice-768.png) | [Practice](after/practice-768.png) |

## Exact change inventory

Production files modified (2):
- `apps/web/src/components/auth/ProductShell.tsx`
- `apps/web/src/components/design/ScrollStrip.tsx`

New verification script (1):
- `scripts/design/check-family-navigation.mjs`

Evidence files added under `artifacts/evaluation/`:
- `REPORT.md`, `visual-comparison.txt`
- `before/results.json`, `after/results.json`
- `before/{practice,progress,design-light,design-dark}-{320,390,768}.png` (12)
- `after/{practice,progress,design-light,design-dark}-{320,390,768}.png` (12)
- `after/long-labels-multiple-contexts-{320,390,768}.png` (3)

No backend, policy, schema, migration, test assertions, dependency manifests/lockfile, branding or approved token files were changed. Runtime tooling, database, secrets, logs and session state stay ignored in `.workspace`. Commit SHA is supplied in the final response (the commit cannot embed its own SHA).

## Review gate

Stop here for evaluation review. No major functionality, clinical deployment, real patient data, external email or AI processing was introduced.
