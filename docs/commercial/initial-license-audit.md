# COM-02: initial repository provenance and license evidence

Evidence date: 2026-11-09. **PRELIMINARY — NOT A COMPLETE COMPLIANCE AUDIT.** Based on selected default-branch repository files; no license compatibility or ownership approval is asserted.

## Verified observations
| Evidence | Observation | Follow-up |
|---|---|---|
| GitHub repository metadata | `NTinkicht/TheraBridge-Emergent` is public; default branch `main` | **Intentional owner decision** for GitHub Actions/CI capacity. Retain public visibility; review historical exposure/forks without proposing privatization |
| Root `LICENSE`, `LICENSE.md` | Not found on main at inspection time | Hold final proprietary notice until commercial authority confirmed |
| Root + workspace `package.json` | `private: true` present | This is npm publish protection, **not** a GitHub repository privacy setting or license |
| `yarn.lock` | Present; dependency pin/integrity records | Generate complete license-attributed SBOM and dependency license verification, including transitive deps |
| API dependencies | NestJS, Fastify integration, Prisma, argon2, RxJS, validator/transformer and utilities | Check direct and transitive terms, redistribution and notices |
| Web dependencies | Next.js, React, Lucide React and three Fontsource font packages | Audit library, icon and actual typeface licenses; confirm attribution and redistribution needs |
| `Dockerfile.preview` | Uses `node:20-bookworm-slim`, apt system packages and Yarn install | Include base image, OS packages, binaries and their notices in enterprise distribution review |
| `docs/emergent/brand/LOGO_DERIVATIVES.md` | Original logo at `assets/brand/original/TheraBridge-Logo-original.jpg` generates multiple deployed images | Record creator, assignment/permission and trademark clearance; derived image does not establish source ownership |
| `docs/product/MASTER_BLUEPRINT.md` | Explicitly synthetic only, clinical workflows disabled until authorization | Preserve the production/clinical NO-GO separately from licensing work |

## Risk register
1. **HIGH / OPEN — provenance and exclusive ownership:** Author, institution, student, partner and tool-generated contribution terms are not established from inspected repository evidence. Owner-provided contracts are needed.
2. **HIGH / OPEN — public repository exposure:** Owner explicitly wants this repository kept public to avoid GitHub Actions/CI limits. Document publication history, forks, and potential sensitive disclosures; do not change visibility. Public source visibility does not itself confer an open-source license.
3. **HIGH / OPEN — third-party asset licensing:** Confirm original TheraBridge logo creator and usage rights; inventory task catalogue illustrations, other visual media, fonts and models. Related image license QA issue #264 and image generation workflow issue #198 should be reviewed, without assuming they satisfy commercial rights clearance.
4. **MEDIUM / OPEN — software license obligations:** Lockfile lists packages/versions but does not prove their licenses. Generate SBOM using audited tooling and resolve license identity, notices, copyleft conditions, OS-level licenses and distribution modes.
5. **MEDIUM / OPEN — AI/model/data terms:** Models, generated output rights, datasets, and external APIs may have separate restrictions beyond npm dependencies.

## Auditable completion procedure
- Pin a reviewed commit SHA and scan the **entire** repository tree/history rather than selected files.
- Generate lockfile-based SPDX or CycloneDX SBOM and capture tool name/version/commands and raw evidence.
- Review direct/transitive npm package terms, container components, deployed assets, typefaces, generated media, models and external services.
- Produce explicit dispositions: permitted / permission required / replace / unresolved. Link evidence without copying confidential rights agreements into repo.
- Obtain counsel assessment for redistribution/on-premise licensing as distinct from hosted SaaS use.
- Have security assess public exposure, workflows, logs, credentials, and what can be protected while maintaining public Actions/CI and previews. No visibility changes are planned.

## Status
Initial reconnaissance complete. Full source/contribution review, scans, legal classifications and approvals **NOT RUN / NOT VERIFIED**. Commercial licensing authorization: **BLOCKED** pending #312 and #313 evidence.
