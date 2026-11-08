# M4-F02 — Runtime, protected-QA reliability and measurable coverage
**Parent work units:** #181, #182; follow-up #269.
## Existing merged code (do not rebuild)
- #274 batches 5,000 synthetic appointment notice lookups, preserves 14-day boundaries and duplicate ID behavior.
- #275/#283/#288 retain six exact-head jobs, pin reviewed suite files, and fail closed on Gitleaks downloads/configuration; #278 is closed.
- #267/#287/#289 deliver protected QA and authenticated 403/404 permission-negative contract, not a successful ten-account hosted run.
## New implementation
- `hosted-extra-therapists.mjs`: protect retry against stale `hosted-extra-results.json` by writing a mode-0600 fresh temporary file in the private 0700 folder and atomically renaming it into place, never following a preexisting destination symlink or touching credential files.
- Runtime regression tests simulate a blocked preflight followed by denied three-user retry in the same directory, assert result replacement, zero temp leftovers and no secrets in artifacts.
- `m4-measured-coverage.mjs`: parse instrumented Istanbul API and Web json-summary reports; fail closed on missing/invalid files and gate each scope/metric at 95% when actual measurements are provided. Negative tests run in required CI. **The gate utility alone is not measured application coverage**.
## Remaining acceptance
Measured *actual full-scope* API/Web coverage reports, resource/load baselines, bounded queries, queue/dead-letter retry and working-tenant service performance remain UNVERIFIED. Existing limited fingerprint coverage is not project-wide ≥95%. No operational worker/deployment changes in this slice. Exact-head six CI jobs and independent review required; M4-07/#181 and M4-08/#182 must not close solely for having the measurement tool.