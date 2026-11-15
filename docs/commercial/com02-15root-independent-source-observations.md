# COM-02 — Independent source-root metadata crosscheck for 15 exact npm versions

**Status: 15 immutable source-root manifest observations; ZERO npm publication-to-source build attestations, ZERO commercial licenses, ZERO clinical authorization.**

Tracks [#356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356) and related [#360](https://github.com/NTinkicht/TheraBridge-Emergent/issues/360). This evidence snapshot was prepared on 2026-11-15 by cross-checking the latest exact-run CI correspondence report against independent GitHub commit and `package.json` file lookups **at exact immutable Git revisions**. It is not a replacement for the existing 53-exception rights queue or the 8-version/9-file curated source-license inventory.

## Concrete bounded result

- **15/15** source-root names and versions match the exact immutable Git commit manifests.
- **13/15** commit/file reads resolved in the same GitHub repo path claimed by the npm registry metadata.
- **2/15** resolved in alternative repositories **at the same exact Git commits and with the same package version**:
  - `consola@2.15.3`: original claim `nuxt/consola`; independently observed at `unjs/consola`, commit `c99ff6c4a54a6a7eccea26aa37603b9b36535d48`.
  - `tr46@0.0.3`: original claim `Sebmaster/tr46.js`; independently observed at `jsdom/tr46`, commit `a8009f9ce80ff5dbe71dd71e203afe4e4c878d28`.
  - **These observations do not prove repository succession or transfers of copyright.** Historical provenance/alias proof is still required and the two records stay distinctly classified.
- The seven source manifests outside the earlier eight curated revisions declared either `MIT` or `BSD-2-Clause` in `package.json`. These are **self-declared SPDX metadata only**. Common root LICENSE paths tested at those exact revisions did not yield authoritative texts. Do not copy current-default-branch LICENSE files to represent old releases.
- The existing bulk CI independently hashed nine immutable LICENSE paths for the previously curated eight versions. Those bytes are evidence of source-file text, **not** independently proven npm artifact license terms or permission to redistribute.
- The remaining 38 of the original 53 exceptions have **no new source-root verification** from this evidence wave. The 91 source assets and missing commercially signed OCI images are still separate blockers.

## Machine-readable evidence and honest boundaries

`docs/commercial/com02-independent-root-observations.json` contains 15 explicit name/version/claimed repo/observed repo/commit/public Git blob SHA-1/source manifest SHA-256 rows with no legal approval. **The Git blob hash is Git SHA-1 and is not the npm archive SRI or a license proof.** Source manifest SHA-256 comes from the existing CI immutable raw-file evidence; the Git blob IDs were observed using GitHub's exact-ref file API. Immutable commits were verified via GitHub for 13 direct repository claims; the two alternate repo commits were independently supported by exact-ref file retrieval. The committed record is a dated observation, not live GitHub API provenance.

The verifier `scripts/commercial/reconcile-independent-root-observations.mjs`:
1. Requires the existing **full 53-row** exact npm registry/lock correspondence report, with zero prior authorizations.
2. Enforces all 15 exact names, versions, claimed npm repository identities and Git commit revisions; explicit alternate-repository exceptions cannot be silently relabeled as authenticated original repositories.
3. Reconciles the source-manifest SHA-256 from the immutable upstream fetch to the frozen independently inspected snapshot. Actual contradictions or false grants fail; transient upstream fetch failures remain **UNVERIFIED**, not positives.
4. Produces an exact-run report archived with the existing licensing CI evidence. Reports **zero** publisher-to-source build attestation, zero license grants, no final notices and G2/G2b NO-GO.

```bash
node --test scripts/commercial/reconcile-independent-root-observations.test.mjs
node scripts/commercial/reconcile-independent-root-observations.mjs \
  /tmp/therabridge-com02-source-correspondence-candidates.json \
  docs/commercial/com02-independent-root-observations.json \
  /tmp/therabridge-com02-root-observation-reconciliation.json
```

A source commit existing, source `package.json` matching, signed npm subject, or LICENSE text hash **alone is insufficient** to show that exact published archive bytes were built from that source tree and unchanged build inputs. For that stronger statement, require independent signed build/release provenance and a reproducible build where feasible; Native SWC packages and semantic-PAX exception remain separately unresolved. Neither this report nor a passing CI licenses SaaS network operations or Enterprise redistribution. Institution/student/partner ownership and UAE counsel approval remain in [#312](https://github.com/NTinkicht/TheraBridge-Emergent/issues/312), clinical governance remains G2/G2b NO-GO, and this public GitHub repository remains public by owner choice.
