# COM-02 — Actual npm archive/source-root correspondence (Node 24 rebaseline)

**Status: IMPLEMENTED, EXACT-HEAD CI AND INDEPENDENT REVIEW PENDING. NOT publisher/build attestation or legal clearance.**

Follows merged PR #398, supersedes stale-base PR #399 following PR #400's Node 24 / NestJS 12 / Jest 30 upgrade. The current exact npm exception population is **44 = 21 DefinitelyTyped + 23 non-DefinitelyTyped**. Of these, **10** currently locked packages are categorized as source-root candidates. **Nine** have independently frozen source-root `package.json` observations (from 15 historical records, six retired); **one additional exact current root, `unicode-emoji-modifier-base@1.0.0`, lacks a frozen independent observation and must remain explicitly unavailable**, never silently omitted.

## Executable evidence

`scripts/commercial/compare-nondt-published-manifests.mjs` consumes, in the same CI run:
- The closure-derived non-DT workqueue (the exact current lockfile population)
- Frozen 15-version immutable Git source-root observations
- Independently recomputed Git source-root reconciliation, bound **by SHA-256** to the same-run workqueue's correspondence digest
- The current frozen Yarn v1 lock

For each of nine independently observed root candidates, download the pinned npm archive only from allowlisted registry HTTPS URLs, verify Yarn SRI and frozen tarball SHA-256, extract the original `package/package.json` bytes through a bounded fail-closed TAR parser, and compare their SHA-256 with separately corroborated immutable Git-source manifest bytes. Reject contradictory digests, duplicate/unsafe TAR entries, PAX/GNU override formats, forged approval, version/count drift. Transient Git source-read failures count as **unavailable**, never as verified or silently omitted.

The tenth candidate, `unicode-emoji-modifier-base@1.0.0`, is emitted with status `SOURCE_OBSERVATION_PENDING_CURRENT_LOCKED_PACKAGE` and zero source/archive verification in this comparator; obtaining a current immutable source observation is separately required. Output is archived as `/tmp/therabridge-com02-nondt-published-manifest-comparison.json` with source input digests, exact per-version result, and **zero** independent publication-to-source/rights approvals. The `SOURCE_NOT_CORROBORATED_SAME_RUN` cases remain unavailable. Byte comparison of only root manifest does not prove npm build provenance or whole archive/source equality.

## Historical evidence and current rebaseline

The prior Node 22 / NestJS 11 lock contained 46=25+21 exceptions and 11 source-root candidates. Historical CI 43949059624 found **10 exact published manifest matches**, **1 raw mismatch** for `@tokenizer/token@0.3.0`, and **0 unavailable**; that evidence does **not** qualify the new 44-version lock. The single manifest mismatch is tracked by #402.

The current Node24/Jest30 workqueue has ten root candidates, of which nine are eligible for frozen-observation comparisons and one remains pending; fresh CI receipts are required. Published archive integrity, raw manifest correspondence, source-build issuer, counsel approval, copyright ownership and actual SaaS/Enterprise OCI distribution must remain separate.

## Release safety / outstanding work

- **23** non-DT exceptions, **21** DT exact releases, and **91** nonpackage asset rights are not cleared.
- Strict signed npm publisher/workflow/source build provenance is still needed per exact package.
- Source file/recipe comparisons beyond `package.json` and resolved `@tokenizer/token` packaging differences (#402) remain for later COM-02 units.
- Actual signed SaaS production release and Enterprise shipped digest/SBOM/delivery receipts have not been independently verified.
- All legal grants, final notices and clinical G2/G2b activation remain NO-GO.

**Merge gate:** exact-head six CI jobs, SBOM and Smart CI, complete Codex review/disposition, Rule 7 evidence, clean main ancestry. No production deployment or clinical activation.
