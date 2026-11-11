# COM-02 — consolidated source provenance, immutable notices, and release scope

Status: **IMPLEMENTATION IN PROGRESS / NOT YET QUALIFIED / NO LEGAL CLEARANCE**.

Tracks #356, #354, #351, #349, #346. Predecessor PR #357 is merged.

This is a deliberately bundled evidence-only PR, **not** authorization to launch, redistribute or sign clinical reports.

## Scope accepted as one cohesive batch
1. Every one of the 53 exact-version npm exceptions gets deterministic, reproducible provenance triage including 15 source-root matches, 33 missing GitHead, 3 Next monorepo mismatches, and 2 disallowed repo origins.
2. For source-root candidates, find and hash only allowlisted upstream LICENSE/NOTICE/COPYRIGHT candidate paths at immutable Git commits, never branch tips; maintain publisher-to-source correspondence as **not independently attested**.
3. Separate tracked source assets and container/build inputs from *proven* deployed-file distribution, without guessing which of the 91 rights obligations disappear in production.
4. Produce one package/asset/counsel-facing review queue with SaaS/network vs enterprise/on-prem rights still unresolved; include one independently unresolved semantic-PAX archive row.
5. Fail-closed offline tests, deterministic CI-generated artifacts, all four Rule 7 handover updates, full six-job exact-head CI, Codex review and PR disposition.

Unsigned commercial legal/IP/third-party rights and clinical G2/G2b approvals remain **NO-GO**. No automated final licenses or THIRD_PARTY_NOTICES issuance.

## Implemented consolidation

- `scripts/commercial/build-bulk-rights-evidence.mjs` joins the exact publisher tarball/version exception register, exact npm-to-pinned-source candidate inventory and all source asset hashes; absence, duplicates, tampered approvals or inventory drift fail closed. Every version receives a provenance triage category (Next.js monorepo, DefinitelyTyped missing release Git SHA, legacy untrusted Git URL, root-manifest match, or missing source revision).
- `docs/commercial/upstream-license-path-candidates.json` records **eight exact npm package-version source commit candidates with nine path-specific source file candidates**, based on GitHub commit tree inspection (cssesc, emoji-regex twice, jsesc, postcss-selector-parser, punycode, tmp, type-fest with two distinct notice terms). Each revision must equal the recorded registry gitHead, locked publisher SRI must match and its repository identity must match before any HTTP request. They are **text hash candidates**, not declarations of license ownership or legal permission.
- The existing absolute-deadline/no-redirect raw GitHub reader hashes exact immutable LICENSE/NOTICE bytes, with strict size and UTF-8 checks. No raw third-party text is committed and no publisher-to-commit attestation is automatically accepted. Unavailable text remains an explicit error row; each task retains the original package version.
- All **91 tracked non-package assets** retain their exact SHA-256 and unresolved SaaS/enterprise rights. Dockerfiles/build assets, brands and illustrations are assigned **release-presence not verified**, not automatically labelled customer-distributed or exempt from licensing. Supplemental container/OS concerns stay in the queue.
- Existing one semantic-PAX exception remains unresolved. The generator cannot issue commercial grant, final THIRD_PARTY_NOTICES, or clinical G2/G2b approval; all counts for those rights remain zero.

### Qualification

Dedicated offline adversarial tests and the one full-CI artifact stage are wired. Exact-head CI and final Codex approval are **pending until independently confirmed**.
