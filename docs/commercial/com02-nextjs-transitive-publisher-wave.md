# COM-02 — pinned Next.js archive exception and transitive publisher verification wave

**Status:** Engineering evidence only; no legal permission, no clinical gate changes. Tracks #313/#327.

## Next.js 14.2.35 size safeguard

The earlier publisher audit could not process the Next.js 14.2.35 archive because of its 16-MiB compressed size ceiling. This wave introduces an explicit exact name/version exception, `next@14.2.35`, with a **48-MiB compressed** and **256-MiB expanded** bound. All other names and versions retain the existing 16/64 MiB limits. The HTTPS host allowlist, no redirects, 12-second total wall-clock timeout, SRI verification and top-level LICENSE/NOTICE file hashing still apply. If the package exceeds these new bounds or fails to download, the row stays UNRESOLVED. This is not an unrestricted download or an assumed successful verification.

## Non-direct installed npm tarballs

After frozen Yarn installation and the full direct audit, the new verifier:
- Validates installed evidence and the direct-declaration ledger, both with zero legal approvals
- Selects physical installed package *names absent from the direct declaration set* and compares their exact installed version against Yarn's resolved source/integrity
- Fetches at most **160 exact name/version combinations per full CI run**, reusing the six-worker bounded host/SRI/package-root LICENSE/NOTICE verifier
- Compares each available publisher LICENSE/NOTICE SHA-256 against **every corresponding installed physical copy**, with missing files and differences reported as unresolved
- Preserves all other non-direct rows in the transitive report as deferred, missing-lock, unsupported-source or other specific unresolved statuses
- Archives `therabridge-transitive-tarball-evidence.json` alongside the direct tarball report, consolidated obligations queue, installed files and source SBOM

The 160-row sample is an **initial wave**, not a claim that all non-direct packages have been publisher-verified. Counts distinguish installed physical copies from unique name/version combinations. Exact package bytes, license texts, publisher URLs and private legal decisions are not published in the repository. The report remains `legallyApproved:0`.

## Unresolved

- Inspect Next.js size-bound outcome using the exact full-CI artifact. If it remains above the new cap or times out, do not assume it is verified
- Six `@types` packages previously returned no recognized package-root license file; collect authoritative corresponding DefinitelyTyped license/copyright provenance, not just manifest SPDX metadata
- Extend publisher tarball verification beyond the first 160 non-direct combinations; resolve lockfile aliases, missing integrity, platform packages and optional dependencies
- Determine whether published license texts and on-disk files reflect appropriate copyright and attribution, without auto-approving either SaaS hosting or enterprise/on-prem redistribution
- Review runtime/container image layers, OS packages, fonts, logos, illustrations, models and datasets beyond the tracked-file digests
- Obtain IP ownership and rights-holder/counsel signatures before preparing final third-party notices, root proprietary LICENSE or binding customer contracts. Keep G2/G2b NO-GO

The software inventory and this evidence must remain regenerated on full CI for each PR and main push. Failed integrity checks should fail CI while `if: !cancelled()` artifact upload retains the evidence for investigation.
