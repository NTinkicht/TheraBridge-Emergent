# COM-02 — First-pass upstream license evidence (2026-11-09)

**Scope:** 38 direct declarations across the root, API and Web package manifests, audited against current upstream project and font-family license pages. **NOT** an exact-version package audit, commercial authorization, verified third-party notice package, completed transitive audit or legal advice.

## Evidence disposition and boundaries

- `direct-license-evidence.json` records **16 upstream references** and **22 pending checks**, including dev dependencies. All 38 rows deliberately retain `commercialApproval: false`; exact published package VERSION/LICENSE/NOTICE integrity and enterprise redistribution are unverified.
- The pipeline checks this inventory against every current direct dependency name, manifest, scope and range **on each PR and main push**, failing CI if dependencies are added or changed without explicit entries.
- Some direct dependencies are independently distributed subpackages (e.g. `@nestjs/*`, `@prisma/client`) and thus upstream repository general license evidence is **not necessarily conclusive for the particular npm tarball, generated client or binary component**.
- The complete SBOM license review report remains the authoritative **machine-generated triage queue**, not a legal sign-off. Its transitive packages still require exact package LICENSE/NOTICE verification.
- Do not rename this document or the draft CI artifact `THIRD_PARTY_NOTICES.md` for customers before the legal reviewer approves actual copyright text and obligations.

## Observed live scanner gap (PR #329 CI artifacts)

Downloaded the actual workflow-generated source CycloneDX and license classification artifacts (run `42687879189`):

- CycloneDX source inventory has **695 components**.
- Exactly **zero** components contain a `licenses` field with a usable declaration in that source SBOM.
- Automated review summary: `total=695`, `unknown=695`, `restrictive=0`, `candidate=0`, `lockfileOnly=7`, `legallyApproved=0`.
- **CRITICAL INTERPRETATION:** zero flagged restrictive licenses does **not** mean none exist; the scan lacks license metadata. The report must not be presented as a completed license compatibility assessment.

Required follow-up: gather metadata from exact locked npm package artifacts or installed package LICENSE/NOTICE files, capture exact versions and checksums, and compare each result with the lockfile and the SBOM. Preserve a separate classification for unavailable/ambiguous license files. Ensure any review/CI check does not substitute registry labels for actual legal clearance. See issue #313.

## Measured installed-package evidence from PR #329 full CI

Read the actual `therabridge-installed-license-files-04af965f62b36ee85dc9eecb2fbd16eca6e9ea8d` artifact from workflow run `42688909628`. The collector reported:

| Evidence | Count | Meaning |
| --- | ---: | --- |
| Installed package entries | 669 | Includes nested installations and duplicate names/versions in different locations |
| With at least one on-disk LICENSE/COPYING/NOTICE/COPYRIGHT file | 645 | File name, SHA-256 and byte length archived; text and obligations NOT legally reviewed |
| Without a matching license-related file | 24 | Requires further upstream package inspection; manifest SPDX expression alone does not resolve the missing file |
| Manifests without license declaration | 3 | `busboy@1.6.0`, `exit@0.1.2`, `streamsearch@1.1.0`; busboy/streamsearch have license files, exit did not |
| Commercially approved | 0 | No legal review/redistribution authorization given |

**Observed manifest declaration categories:** MIT (548), ISC (46), Apache-2.0 (24), BSD-3-Clause (23), BSD-2-Clause (11), BlueOak-1.0.0 (4), OFL-1.1 (3), Unlicense (2), MIT OR CC0-1.0 (2), Python-2.0 (1), CC-BY-4.0 (1), 0BSD (1), and 3 missing. These are **package.json declarations**, not confirmed copyright notices or legal clearance.

Higher-priority exact-version checks: `argparse@2.0.1` (Python-2.0), `caniuse-lite@1.0.30001817` (CC-BY-4.0), `jackspeak@3.4.3`, `minipass@7.1.3`, `package-json-from-dist@1.0.1` and `path-scurry@1.11.1` (BlueOak-1.0.0), and `exit@0.1.2` (no manifest declaration and no matching license file). All remain REVIEW REQUIRED. The absence of a GPL/AGPL label in this **installed Linux snapshot** is not proof those licenses cannot occur on other platforms, in OS/container packages, artwork or model/service dependencies.

**Important distinction:** the source SBOM contains 695 entries and zero Syft license declarations; the installed package evidence contains 669 entries and metadata/license-file hashes. These are different inventories (lockfile-resolved versus installed on this particular CI environment), and their counts are not directly interchangeable. Platform-optional packages may not install. Continue reconciling exact versions, package integrity and distribution differences.

## Upstream reference findings (NOT exact pinned version verification)

| Package families | Preliminary published license indicator | Source and practical next check |
| --- | --- | --- |
| NestJS framework and CLI | MIT | https://github.com/nestjs/nest — inspect package-specific licenses for each resolved v10 family member, preserve license text when distributed |
| React and React DOM | MIT | https://github.com/react/react — verify actual resolved React v18 packages; keep copyright notices |
| Next.js | MIT | https://github.com/vercel/next.js/blob/canary/license.md — verify exact locked v14 license and packaged third-party notices rather than assuming canary applies |
| Prisma ORM and client | Apache-2.0 | https://github.com/prisma/orm — verify pinned v5.22 package and generated binary dependencies; review Apache NOTICE and patent terms |
| Lucide React/icons | ISC | https://lucide.dev/license — preserve ISC notice and consider Feather-derived icon notices |
| Argon2 wrapper | MIT | https://github.com/ranisalt/node-argon2 — separately review bundled Argon2 reference implementation and native binary notices |
| IBM Plex Sans font family | OFL-1.1 | https://fontsource.org/fonts/ibm-plex-sans/about — verify actual `@fontsource` shipped font files and copyright/reserved font name terms |
| IBM Plex Serif font family | OFL-1.1 | https://fontsource.org/fonts/ibm-plex-serif/about — verify exact bundled font files and OFL notices |
| Plus Jakarta Sans font family | OFL-1.1 | https://fontsource.org/fonts/plus-jakarta-sans/about — verify bundled version and copyright notices |

These are **upstream publisher statements**, not checksums of the actual package LICENSE files nor evidence of authorization to distribute TheraBridge proprietary materials. Do not mark these packages legally approved merely because MIT/Apache/ISC/OFL are generally commercial-friendly.

## Binary, assets and service findings (OPEN)

- Preview uses `node:20-bookworm-slim`; official Node Docker documentation identifies Bookworm as Debian 12: https://github.com/nodejs/docker-node . The **Dockerfile** adds `openssl`, `ca-certificates`, `tini`. Separate Debian/OS package attribution and license examination is still required.
- `docker-compose.yml` service images and deployment-specific digests need independent inventories; the preview-container SBOM is insufficient for redistributing those.
- Original TheraBridge logo, derivative marks and catalogue illustrations have **no proven author/assignment records** from the files inspected. The asset inventory hashes them but does not establish ownership.
- Fonts: Fontsource warns that font files have individual licenses, which may differ from the package wrapper: https://github.com/fontsource/fontsource .
- Model weights/provider API agreements, health-data processing terms and any training/dataset rights cannot be derived from the npm lockfile.
- Code authorship and HCT/student/partner assignments remain OPEN in #312. Protect confidential evidence in restricted storage; do not publish personal agreements or secrets.

## Codex P2 correction — non-hoisted Yarn workspace dependencies

Codex review of PR #329 identified that the first collector only scanned the root `node_modules`, omitting physical workspace-local packages under `apps/api/node_modules` and `apps/web/node_modules`. The collector now enumerates supported `workspaces` from root `package.json` and scans the physical workspace installation trees without following symlinked workspaces. Regression tests cover hoisted and non-hoisted installations, symlink avoidance, and unsupported workspace patterns.

**The initial 669 installed-package count and 24 missing-file count reflect the earlier root-only artifact. They are a historical baseline, NOT a verified whole-workspace count.** Recompute the current totals from the fixed collector's exact-head full-CI artifact before using them for legal review.

## Exact installed-package file evidence (full CI, not legal approval)

The existing full-CI `test` job already performs `yarn install --frozen-lockfile`. A new read-only collector runs **after that install**, walks installed package directories (without following symlinked workspaces), and archives for each installed package:

- package name and exact installed version from its package manifest;
- declared package license label, if any (still unverified);
- on-disk `LICENSE`, `LICENCE`, `COPYING`, `NOTICE`, or `COPYRIGHT` filenames, SHA-256 hashes and byte lengths;
- `EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED` or `NO_LICENSE_FILE_FOUND`; `commercialApproval=false` always.

Artifact: `therabridge-installed-license-files-<sha>` (30-day retention). It covers **actually installed** packages in full CI, not all optional packages, all platforms, software distribution, exact license text interpretation or upstream models/assets. The unconditional lightweight SBOM job remains active on every PR/push; this heavier collector runs on full CI only. This is not a substitute for reviewing each file and its obligation before final customer notices.

## Engineering acceptance already specified for this PR

The repository's existing source SBOM, container SBOM, asset hash inventory and third-party NOTICE **review draft** continue unchanged. New `check-direct-evidence.mjs` tests enforce that all 38 *current* direct dependency declarations are represented and that no row can claim exact-version/legal verification without an independent evidence review. This guards against untracked additions; it does **not** block all unknown licenses or represent a compliant enterprise notice bundle.

## Next legal review

1. Retrieve and hash the actual LICENSE and NOTICE files from exact-version npm packages and resolved transitive modules, including native binaries. Compare with scanner candidate labels.
2. Examine OS packages in deployed image digests and actual enterprise release topology. Record required attribution/source-delivery conditions.
3. Verify copyright ownership for fonts, marks, images and model/data integrations; store privileged evidence privately.
4. Obtain qualified reviewer approval separately for **hosted SaaS** and **customer-managed installations**. Until then, commercial rights, clinical authorization and customer-facing notices remain NO-GO.
