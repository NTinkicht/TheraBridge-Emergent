# COM-02 — 2023 immutable DefinitelyTyped candidate snapshots

**UNATTESTED SOURCE COMPARISON ONLY. No publisher build attestation, intellectual-property grant, commercial approval or clinical release.**

Tracks #356 and #360. Source commit: DefinitelyTyped/DefinitelyTyped@b87d8b54b28154cc9f6054238ff4ae63faa76000, dated November 3, 2023 (historical git candidate).

| Exact npm package | Reported update timestamp UTC | Git source path |
| --- | --- | --- |
| @types/methods@1.1.4 | 2023-11-07 09:09:39 | types/methods |
| @types/cookiejar@2.1.5 | 2023-11-20 23:36:24 | types/cookiejar at Nov 3 and Nov 20 commits |

Package version sources: https://www.npmjs.com/package/@types/methods and https://www.npmjs.com/package/@types/cookiejar. Git candidate: https://github.com/DefinitelyTyped/DefinitelyTyped/commit/b87d8b54b28154cc9f6054238ff4ae63faa76000.

The source package manifests at this historical Git candidate declare versions 1.1.9999 and 2.1.9999, compatible at major/minor with the exact npm packages. That is NOT evidence the publisher actually built its npm archives from this commit. Reported npm timestamps, Git source history, publisher/build authority, and applicable historical hash algorithm remain separate evidence classes.

The existing verify-dt-immutable-source.mjs verifier fetches immutable Git commits/trees/blobs, validates Git blob hashes, and compares source content SHA-256 against exact-version npm publisher fingerprints. The new probe-dt-prepublication-snapshots.mjs runs that verifier for both source paths, archives a two-version same-run receipt in GitHub CI, and NEVER emits historical publisher attestation, legal approvals or clinical GO. Network errors and any manipulated return values result in an unresolved state.

Run: node --test scripts/commercial/probe-dt-prepublication-snapshots.test.mjs. CI generates /tmp/therabridge-com02-dt-prepublication-probes.json using real GitHub API observations. A source match means content equality at that specific Git commit, not independently signed npm publication.

Still unresolved: historical signed publisher/build lineage for all 26 DefinitelyTyped exact versions, 27 other exact npm exceptions, independent SaaS/Enterprise rights for 91 source assets, actual commercial SaaS and Enterprise OCI release digests and filesystems, and owner/UAE counsel decisions. The Render deployment remains a SYNTHETIC demo. G2/G2b remain NO-GO.

## Second cookiejar candidate (not publisher attestation)

A separate exact Git commit `7aa25146316b7bafa0863d69bc5f125cde97f216` is dated **2023-11-20 23:33:15 UTC**, about three minutes before the reported npm update time. Its exact Git blob IDs for `types/cookiejar/index.d.ts` and `types/cookiejar/package.json` match those from the November 2026 source snapshot with the reproduced npm publisher fingerprint; the November 3 snapshot differed. CI now probes both 2023 cookiejar snapshots and one 2023 methods snapshot independently. Blob identity alone does not establish the historical publisher/build commit or complete inclusion/exclusion of other source files. No launch approvals or signed lineage are inferred.
