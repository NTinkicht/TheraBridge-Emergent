# M4-C02 — Database, performance, CI/coverage qualification

**Workstreams:** #180, #181, #182. Reviewable incremental implementation hardens the CI inventory and secrets-scanner contract so six required jobs cannot quietly lose checksum/history/tracked-file scanning, alongside explicit measured-coverage truthfulness checks.

**Existing baseline:** migrated audit triggers / integrity regression, batch notice optimizations, suite inventory and limited fingerprint coverage have already merged. This tranche must not claim ≥95% *application-wide* coverage without real measurement. All pending DB concurrency, Neon connection/migration, pagination, performance baselines and full measured coverage remain open.

**Acceptance:** executable Node regression checks for CI contract, no weakening or false assurance, full six-job exact-head CI and independent review. No migration history rewrite, production deployment or clinical activation.
