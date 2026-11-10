# COM-02 — Exhaustive installed non-direct name/version classification and SWC-specific archive ceilings

**Scope:** #313, #327. **Result is technical evidence, not commercial or clinical authorization.**

The initial non-direct tarball wave attempted 160 of the 620 distinct installed non-direct name/version rows found in GitHub Actions. This expansion raises the **maximum attempted version budget to 768** for the full CI verifier, enough to cover every observed name/version row. The audit continues to derive the population from the freshly frozen Yarn install, not a fixed hard-coded 620-item list. Future changes that exceed 768 stay visibly `DEFERRED_BY_BOUNDED_SAMPLE`.

The exact previously oversized artifacts `@next/swc-linux-x64-gnu@14.2.33` and `@next/swc-linux-x64-musl@14.2.33` get the same **48-MiB compressed / 256-MiB decompressed** ceilings already used exclusively for `next@14.2.35`. All unrelated packages and every other SWC version retain the original **16-MiB compressed / 64-MiB decompressed** bounds. The 12-second wall-clock download deadline, registry-only HTTPS host allowlist, forbidden redirects, integrity-SRI verification and all-installed-copy LICENSE/NOTICE hash checks remain active. A failed or oversized package remains UNRESOLVED; a confirmed publisher integrity or installed-file mismatch fails the full-CI job.

## What the report does and does not mean

The existing full-CI `therabridge-transitive-tarball-evidence.json` file now aims to **classify every installed non-direct name/version row** rather than sample the first 160. It reports attempted, deferred, verified publisher-to-installed license hashes, missing recognized package-root LICENSE/NOTICE, other unresolved statuses and zero legal approvals. Each physical installed package path remains covered by the installed-license inventory; name/version entries and physical copies must not be conflated.

A status of `ALL_INSTALLED_NON_DIRECT_VERSIONS_CLASSIFIED_NOT_LEGAL_APPROVAL` means **all rows were classified** (including missing lock sources, unsafe/oversized archives or missing files), **not** that every tarball passed integrity or that any right was granted. The summary and detailed row statuses are authoritative evidence. Never infer permission from SPDX labels or registry file presence.

## Remaining legal and operational obligations

Review package-specific authoritative LICENSE/NOTICE texts, upstream copyright, notice reproduction, SaaS network terms and enterprise/on-prem redistribution with qualified rights-holder/counsel signatures. Investigate any unverified or ambiguous package rows, including the six prior direct `@types` packages and any transitive `@types` or SWC exceptions. Audit native/runtime/container/OS packages, proprietary/non-code resources, 91 currently tracked assets, fonts, logos, illustrations, models and datasets; the tracked-file hash list is not a rights opinion. Remain open under COM-01/02/03/04 without a final proprietary root LICENSE or binding customer agreement. Clinical G2/G2b NO-GO remains unchanged.

The exhaustive network check is part of full CI qualification. Smart-targeted jobs can skip it according to their approved scope; SBOM and secret scanning remain independent required gates.
