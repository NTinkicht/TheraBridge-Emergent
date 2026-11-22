# TheraBridge CI — 5-minute PR feedback target (2026-11-23)

## Owner decision and explicit safety boundary
Goal: finish mandatory PR feedback in <=5 minutes without losing the eight >=90% API/Web coverage metrics, browser, compose, security/commercial checks or exact-HEAD review. This is a target, NOT a measured SLA.

The original M4-07 600-second test must remain 200 seconds in series at concurrency 1, 4 and 8 against one disposable PostgreSQL-backed, 512 MiB, UID 1000 unified preview. Three 200-second overlapping streams are NOT equivalent to ten continuous minutes. The original runner, receipt schema and negative tests are unchanged.

## Observed baseline
PR #474 run 45073791943 (2026-11-22 UTC), all jobs successful:
- preview-container: 12.4 minutes (critical path)
- test: 5.3 minutes (next bottleneck)
- demo-journey: 4.2 minutes
- compose: 3.1 minutes
- other jobs: <2 minutes

## Changes
1. Full-mode PR: retain all checks including measured coverage, security/rights, image layer inspection, CycloneDX, migrations, seeded login and 404, 512 MiB cgroup, zero OOM. Run three independent concurrent 200-second streams (concurrencies 1,4,8) *overlapping in time* against the same disposable preview. Receipt says PR smoke NOT endurance.
2. Main push, v* release-candidate tag, daily schedule, manual dispatch: full original sequential 600-second M4-07 plus full other checks. A PR smoke receipt is never evidence of passing the M4-07 load.
3. GitHub Actions BuildKit layer cache for exact-image rebuilds. Still verify layers (no sharp/libvips), regenerate exact-image CycloneDX and validate structure. No cache substitutes for a test or license scan.
4. No change to fail-closed Smart CI path selection, coverage >=90% floors, full code/QA/policy checks, reviewer P0/P1/P2 dispositions or clinical G2/G2b NO-GO.

## Release governance
No release or production qualification based solely on the short PR smoke. Release owner must verify on EXACT release-candidate/tag SHA the full 600-second test receipt and all other required CI checks, Codex dispositions, rights and signed clinical gates. Triggering full CI on a tag creates evidence but does not mechanically block GitHub Releases/deploys; configure repository deployment/release protections separately and verify them before claiming enforcement.

## Acceptance
- PR source/regression checks verify both independent profiles, image scan, DB cap, script safety and numeric-only receipts.
- Negative tests reject shortened, serial/fabricated, OOM/root/resource cap and unexpected/raw data evidence.
- Benchmark PR critical path using actual GitHub job started/end times, target <=300s including gate (record runner queues separately). Optimize remaining 5.3-minute test job if needed; never reduce scope to hit a number.
- Verify 600s three-phase receipt on main/tag and explain any failure.
- Do not claim five-minute success before observed CI timings.

Status: WORK IN PROGRESS on implementation PR, exact-head CI and independent review not yet qualified.
