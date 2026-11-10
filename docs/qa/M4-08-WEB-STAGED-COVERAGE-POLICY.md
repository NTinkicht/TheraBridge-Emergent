# M4-08 Web quality coverage policy (owner approved 2026-11-10)

## Staged engineering gates

- **Stage 1 / #337:** one mega PR with genuine measured **at least 60% Web line coverage**, with source-wide Istanbul counters from the production `apps/web/src` tree, all source files including unimported files, and the count of zero-covered files. Record statements, functions and branches as first-class metrics; do not misrepresent them as meeting 60% if only lines qualify.
- **Stage 2 / #338:** one subsequent mega PR targeting **at least 80% Web line coverage**, after Stage 1 has actually merged with verifiable evidence. No artificial expansion of denominator exclusions and no fake metrics.
- **Safety-critical client logic:** retain the separate target of ≥95% measured branch coverage for security-sensitive auth/session/CSRF/access/clinical-release guard modules, together with direct negative security tests. Full critical-jouney and cross-tenant/role negative acceptance stays mandatory even when a percentage is met.
- **General UI:** high-quality assertions on real application components, transitions, integration and accessibility. Avoid mock-only assertions, source-string inspection, snapshots without semantics or automatically generated trivial tests solely to push counters.

## CI and review

The existing `scripts/qa/m4-web-jest.config.cjs` source-wide instrumentation and the API coverage pipeline remain the measurement source. Do not discard or narrow prior source files, or confuse successful CI with milestone qualification. Every gate needs explicit before/after exact-SHA coverage measurements and reproducible commands, positive and negative tests, passed mandatory checks, Smart CI, SBOM, secret scan, independent final-head Codex review and Rule 7 evidence. No clinical approval is inferred.

## Current status

Prior to merged #334 the recorded baseline was 151 Web source files, 10.63% lines, 7.05% branches, 7.86% functions, 9.89% statements, and 123 zero-covered files. Re-measure main and each PR head; none of the earlier numbers constitute Stage 1 qualification. G2/G2b clinical gates remain NO-GO and real patient data are prohibited in synthetic tests. The separate M4-02 hosted authentication and M4-09 audit-evidence gates remain open.
