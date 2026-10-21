Clinical plan replacement previously superseded a version under review without explicit withdrawal, and report evidence could mix observations across differently defined goal versions. This synthetic-only foundation adds author-owned, revision-checked review/withdrawal/internal-freeze lifecycles, immutable evidence snapshots and fingerprints, role-restricted governance screens, and separate consent/authorization/recipient-release structures that remain non-authorizing and locked.

**Draft for independent review. Base: `freebuff-qualification-issue47-20261021`. Do not merge or deploy.** Exact starting commit: `90e474f477a654d47cf934429d2ca03256fd74d2`; accepted #45/#47 fixes preserved. Neither PR #48 nor #49 was merged.

### Implemented

- Transactional actor/tenant/child/service/owner/revision checks; explicit N25 withdrawal preserving reviewed content; supervisor comments/return; immutable snapshots, status history and view audit.
- Exact-version internal previews with canonical SHA-256, frozen clinical/evidence content and a clear “not approved, signed or released” notice. Later edits/observations cannot change an existing preview ID. Review evidence remains bound to submission.
- Goal identity scoped by plan and plan version; separate same-service plans and units/baseline/target context. Linked observation notes checked for child/center/therapist/service at API and DB (#39/#40/#43/#44 intersections).
- `/app/governance` clinical queue/history/previews and `/app/access-review` operational access/consent-readiness review. Administrators cannot read clinical records; guardians cannot read drafts or previews.
- Separate immutable policy/consent proposals and recipient principals; release/authorization/history tables blocked in PostgreSQL. Transfer requests are simulations and grant no access.
- Additive migration `20261028090000_tb_em_011_governance`; existing report release refusal and other safety constraints preserved.

### Validation

- Full API suite against PostgreSQL 16.15: **441/441 PASS**, 11 suites; no skips or weakened security assertions.
- API/web typechecks and both production builds: **PASS**.
- Playwright: **28 checks PASS**, zero page errors. 25 screenshots across **320, 390, 768, 1024, 1440px**, no horizontal document overflow.
- Real browser author → supervisor review/comment/return → resubmit → explicit withdrawal → immutable preview. Guardian governance denial and family sample screens checked. Loading/error/retry/empty transport fixtures are explicitly labelled separately.
- Gitleaks export and existing full-history scans: **PASS**. No tokens, credentials, real patient data or deployments.
- **Not verified:** Docker/container checks (socket permission denied), independent CI/review, real-patient/production functionality.

[Detailed scope, permissions, transitions and limitations](docs/emergent/workunits/TB-EM-011.md) · [validation and test logs](artifacts/tb-em-011/VALIDATION.md) · [browser checks](artifacts/tb-em-011/browser-results.json)

### Clinical governance gates

Canonical private `NTinkicht/TheraBridge` specifications were unavailable (unauthenticated API 404 and unauthenticated GitHub CLI). SRS/design/architecture/risk/decision-register reconciliation remains pending. **D1, D4, D7, D-NEW-3, D-NEW-5, OR-15 and OR-16 remain blocked for accountable human authorization.** No clinical signing/final approval, genuine consent grant, real release, custody policy, media/AI/recording or production deployment is enabled. Existing synthetic messaging/practice demonstrations remain isolated. Historical reviews predating this migration are not retrospectively reconstructed.

### Browser screenshots

![Supervisor review](https://github.com/NTinkicht/TheraBridge-Emergent/blob/freebuff-tb-em-011-governance/artifacts/tb-em-011/supervisor-review-1440.png?raw=true)
![Access and consent readiness at 390px](https://github.com/NTinkicht/TheraBridge-Emergent/blob/freebuff-tb-em-011-governance/artifacts/tb-em-011/access-review-390.png?raw=true)
![Immutable internal preview](https://github.com/NTinkicht/TheraBridge-Emergent/blob/freebuff-tb-em-011-governance/artifacts/tb-em-011/immutable-preview-1440.png?raw=true)

### Exact changed files

```text
apps/api/prisma/migrations/20261028090000_tb_em_011_governance/migration.sql
apps/api/prisma/schema.prisma
apps/api/src/auth/policy.ts
apps/api/src/cli/seed-governance-synthetic.ts
apps/api/src/clinical/clinical.controller.ts
apps/api/src/clinical/clinical.dto.ts
apps/api/src/clinical/clinical.module.ts
apps/api/src/clinical/clinical.service.ts
apps/api/src/clinical/governance-core.ts
apps/api/src/clinical/governance.controller.ts
apps/api/src/clinical/governance.dto.ts
apps/api/src/clinical/governance.service.ts
apps/api/src/clinical/reports.controller.ts
apps/api/src/clinical/reports.service.ts
apps/api/test/authz.e2e-spec.ts
apps/api/test/clinical.e2e-spec.ts
apps/api/test/governance.e2e-spec.ts
apps/api/test/progress-reports.e2e-spec.ts
apps/web/src/app/app/access-review/page.tsx
apps/web/src/app/app/governance/page.tsx
apps/web/src/app/app/reports/[id]/page.tsx
apps/web/src/components/auth/ProductShell.tsx
apps/web/src/components/centers/kit.tsx
apps/web/src/components/clinical/PlanEditor.tsx
apps/web/src/components/clinical/ReportSide.tsx
apps/web/src/components/clinical/ReportsPanel.tsx
apps/web/src/lib/clinical.ts
apps/web/src/lib/governance.ts
apps/web/src/lib/reports.ts
artifacts/tb-em-011/PR_DESCRIPTION.md
artifacts/tb-em-011/VALIDATION.md
artifacts/tb-em-011/access-review-1024.png
artifacts/tb-em-011/access-review-1440.png
artifacts/tb-em-011/access-review-320.png
artifacts/tb-em-011/access-review-390.png
artifacts/tb-em-011/access-review-768.png
artifacts/tb-em-011/api-build.log
artifacts/tb-em-011/api-tests.log
artifacts/tb-em-011/api-typecheck.log
artifacts/tb-em-011/browser-results.json
artifacts/tb-em-011/changed-files.txt
artifacts/tb-em-011/docker-check.log
artifacts/tb-em-011/export-secret-scan.log
artifacts/tb-em-011/family-family-progress-1024.png
artifacts/tb-em-011/family-family-progress-1440.png
artifacts/tb-em-011/family-family-progress-320.png
artifacts/tb-em-011/family-family-progress-390.png
artifacts/tb-em-011/family-family-progress-768.png
artifacts/tb-em-011/family-practice-1024.png
artifacts/tb-em-011/family-practice-1440.png
artifacts/tb-em-011/family-practice-320.png
artifacts/tb-em-011/family-practice-390.png
artifacts/tb-em-011/family-practice-768.png
artifacts/tb-em-011/history-secret-scan.log
artifacts/tb-em-011/immutable-preview-1024.png
artifacts/tb-em-011/immutable-preview-1440.png
artifacts/tb-em-011/immutable-preview-320.png
artifacts/tb-em-011/immutable-preview-390.png
artifacts/tb-em-011/immutable-preview-768.png
artifacts/tb-em-011/migrations.log
artifacts/tb-em-011/supervisor-review-1024.png
artifacts/tb-em-011/supervisor-review-1440.png
artifacts/tb-em-011/supervisor-review-320.png
artifacts/tb-em-011/supervisor-review-390.png
artifacts/tb-em-011/supervisor-review-768.png
artifacts/tb-em-011/web-build.log
artifacts/tb-em-011/web-typecheck.log
docs/emergent/data/DATA_MODEL.md
docs/emergent/handover/CURRENT_STATE.md
docs/emergent/handover/NEXT_WORK.md
docs/emergent/handover/WORK_LOG.md
docs/emergent/qa/OPEN_ISSUES.md
docs/emergent/qa/TEST_RESULTS.md
docs/emergent/security/PERMISSIONS_MATRIX.md
docs/emergent/workunits/TB-EM-011.md
scripts/qa/tb-em-011-browser.mjs
```
