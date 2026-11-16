# COM-02 next work unit — independently reproduce 21 non-DefinitelyTyped npm publication/source evidence

**Status: PLANNING ONLY / NOT IMPLEMENTED / NOT TESTED / NO APPROVAL.**
Predecessor: merged PR #398 (commit `70b1e6928632e6b44efcf7d1ca4e1301dedede4e`).
Tracks #356, #360, #371. Current frozen lock: **46 exact npm exceptions = 25 DefinitelyTyped + 21 other**.

## Work unit boundaries

The 21 non-DefinitelyTyped exact versions are:
- 11 `SOURCE_ROOT_MANIFEST_ONLY` with existing immutable version-specific upstream commit candidates.
- 7 `MISSING_IMMUTABLE_SOURCE_REVISION` (including 3 Next.js 16.4.6 signed release candidates but no registry gitHead).
- 2 `MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED` native LGPL `@img/sharp-libvips-*` packages, retained in the lockfile but explicitly stripped from current runtime images.
- 1 `LEGACY_REPO_ORIGIN_UNTRUSTED`.

Inputs MUST originate from **one exact CI run**: COM-02 closure ledger, non-DT workqueue, original registry manifest/SRI, independently verified npm tarball evidence, immutable upstream commit/source bytes and pinned toolchain. Do not assume an archive file and source tree are equal because npm declares a `gitHead` or matching package version.

## Ordered implementation

1. **11 source-root version records:** retrieve the original exact npm archive from allowlisted npm/yarn registry with frozen Yarn SHA-512 integrity, bounded TAR semantics, and extract/record immutable package file hashes. Independently retrieve the exact Git commit and permitted `package.json` plus candidate source files with Git object/tree checks. Record byte-level matches/mismatches and missing/generated files; never silently ignore differences, forbidden redirects or unsupported PAX metadata.
2. **Publication link:** independently authenticate npm publisher/build identity, signed subject name/version and the **actual tarball digest** with trusted issuer/run; bind build recipe and immutable source revision. A generic signature, source metadata match, or publisher-supplied `gitHead` alone leaves `publicationToSourceIndependentlyAttested=false`.
3. **Seven missing-revision cases:** use signed upstream release/build provenance where genuinely available, otherwise keep `REVISION_UNRESOLVED`; no guessed tags or Git SHAs.
4. **Two libvips binaries:** separate lockfile presence from runtime redistribution, prove edition-specific digest/file absence in independently attested *actual* SaaS and Enterprise images; preserve LGPL notice/source-offer analysis for any future shipment.
5. **One untrusted origin:** validate canonical repository ID/owner/immutable commit through independent restricted endpoints; no alias assumption or mutable tag trust.
6. Reconcile against 25 DT versions and 91 unresolved assets without changing their rights status. Require a real signed SaaS production deployment and a separately delivered Enterprise release OCI receipt before any edition is marked authenticated.

## Qualification and expected evidence

- New offline adversarial tests for source/tarball mismatches, forged subject/source commit, TAR/PAX unsafe semantics, package identity drift, missing build issuer, license grant forgery, and same-run ledger swap.
- CI archives per-version evidence, comparison status and exact upstream URLs/digests with no secrets or third-party license text copied to the public repo.
- New proof states must distinguish `SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION`, `SOURCE_BYTES_MISMATCH`, `UNAVAILABLE`, and `INDEPENDENTLY_VERIFIED_PUBLICATION` only where strict trusted release provenance can actually be validated.
- Rule 7 updates required: `CURRENT_STATE.md`, `WORK_LOG.md`, `NEXT_WORK.md`, `TEST_RESULTS.md`.
- Full exact-head six-job CI, SBOM/Smart CI, independent Codex, Rule 13 disposition before any merge.

**No automatic source rights, commercial license, third-party notices or clinical G2/G2b GO.** Keep public GitHub unchanged and synthetic-only restrictions preserved.
