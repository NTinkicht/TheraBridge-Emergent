# M4-01 — Open-issue reconciliation snapshot

> This is a **snapshot**, not closure evidence. Original M1–M3 implementation is declared closed by owner; open issue titles must be reconciled with current HEAD and tests. Generated from GitHub issue search on 2026-11-07, before/while new M4–M11 roadmap issues were added. Search may reflect indexing delay.

## Audit method

For each issue: (1) review currently merged implementation and exact test names, (2) locate requirements / policy authority, (3) classify **VERIFIED**, **PARTIAL**, **MISSING**, **POLICY_BLOCKED**, **SUPERSEDED**, or **DUPLICATE**, (4) add evidence URL and new M4–M11 work ID, (5) only then close stale issues. An issue open status alone never proves functionality absent.

## Historical issues retrieved: 2

| Existing # | Historical issue title | Proposed disposition |
|---:|---|---|
| [#135](https://github.com/NTinkicht/TheraBridge-Emergent/issues/135) | [GH-19] [Wave 5] ops(docker): harden Dockerfiles to run as non-root user, bound Node heap for Render 512MB RAM & add CI concurrency/timeouts | **TO TRIAGE:** merged source + tests + policy |
| [#136](https://github.com/NTinkicht/TheraBridge-Emergent/issues/136) | [GH-20] [Wave 5] test(quality): add unit test runner to @therabridge/web, enforce >=95% coverage gates across API & Web, centralize env config & align docs | **TO TRIAGE:** merged source + tests + policy |

## New roadmap issues in same search: 98

New roadmap work is indexed by tracking epics [M4 #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167)–[M11 #174](https://github.com/NTinkicht/TheraBridge-Emergent/issues/174); do not classify the newly created issues as historical technical debt.

## Known special handling

- **GH-01…GH-20:** prior M2 wave issues; verify fixes on main, not obsolete branches.
- **TB-EM-051 / 052 / 053:** signed policies/synthetic models do not authorize real clinical transfer, protected releases or signing.
- **Hosted QA #81 and session cleanup:** protected external browser evidence needed separate from CI.
- **PR #166 P2 findings:** tracked by [M4-03](https://github.com/NTinkicht/TheraBridge-Emergent/issues/177).
- **Visual/UI roadmap:** all M5 work is intentional new scope, not a regression against M1–M3 sign-off.
