# M4-08 — Application-wide Web coverage instrumentation and target gap closure

**Status: draft scope checkpoint only — NOT IMPLEMENTED / NOT TESTED / NOT REVIEW QUALIFIED.**

Parent: [M4-08 #182](https://github.com/NTinkicht/TheraBridge-Emergent/issues/182); epic [M4 #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167).
Predecessor: [M4-07 PR #305](https://github.com/NTinkicht/TheraBridge-Emergent/pull/305), merged to main as `2a4abb74764a213aec0aa94c4d889eed9cb966a1`.

## Verified prior work: do not duplicate

- API real Istanbul coverage baseline is already generated from all `apps/api/src/**/*.ts` via the full Jest suite, and the aggregate-only artifact is uploaded by CI (PR #301). The 2026-11-09 measured baseline was **95.46% lines, 78.83% branches, 93.69% functions, 91.31% statements**, from 93 instrumented API source files. Re-measure on current head before citing the values as current.
- Existing Web `node --test` exercises tests but does **not** provide a valid whole-application Istanbul lines/branches/functions/statements report. V8 source-module observation is diagnostic only, not a percentage. Baseline reported 150 Web source files and one observed source module; current scope must be recalculated.
- Already merged: suite inventory (#275), supply-chain/secret-scan hardening (#288), true parser/acceptance validator (#292), measured API baseline (#301), Smart CI conservative shadow gate (#303). Keep them intact.

## This PR's bounded engineering work

1. Choose and implement a deterministic, pinned **instrumentation pipeline for actual Web application source**. Include Next.js App Router pages/components/server paths and relevant tests, with reproducible builds and coverage collection. Include source files not imported by tests in the denominator. Do not confuse transpiled/bundled/generated artifacts with source coverage.
2. Produce a sanitized artifact reporting Web and API **lines, branches, functions, statements** from a genuine instrumenter with source scope/file count, exact runner/run provenance and explicit threshold gaps. No user identities, cookies, raw source, URL secrets, HTTP bodies or clinical data.
3. Establish negative regression tests: missing source modules, empty or invalid counters, manipulated denominator, fake zero-coverage omission, duplicate paths, malformed/partial reports and unexpected schema fields must fail closed.
4. Add targeted Web tests for measured gaps without substituting source-string inspection for executed code coverage. Keep existing Web unit tests and Playwright regressions working, preserving existing auth/role policy.
5. Re-measure actual API coverage after M4-07 changes; prioritize API branches/statements/functions that remain below 95%. Add narrowly scoped tests only after the real deficit is identified.
6. Introduce staged coverage gate: first collect/report honest failures; enforcement of all four **>=95%** targets only once genuine API+Web measurements and any **owner-approved, narrowly justified exclusions** qualify. Never silently lower targets or claim release PASS from baseline CI success.

## Acceptance

- [ ] Actual Web source-wide report for four metrics generated and testable, with zero-coverage modules accounted for
- [ ] API+Web summary has verified denominators, evidence provenance and explicit below-target metrics
- [ ] Coverage regressions positively/negatively test fail-closed report validation
- [ ] Targeted tests improve measured gaps without new behavioral regressions
- [ ] Six original CI jobs and `smart-ci-gate` PASS on final HEAD; independent Codex exact-head review; all comments dispositioned
- [ ] All M4-02 protected hosted QA, M4-06/07 remaining qualification, 95%-target exceptions, G2/G2b clinical gates stay distinct and open as warranted

**No clinical activation, live patient data, shared Render/Neon changes, migration rewrites or production deployment.** Parent #182 and M4 epic #167 remain OPEN until their complete exit evidence is independently qualified.
