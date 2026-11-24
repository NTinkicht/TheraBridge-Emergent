# M5 PR C — secure media delivery and coverage

Base: faa4b032d6d54a50870ddd5965fe8e64249ccbfc (merged PR B). Predecessor artwork intake: #493. Trace #195, #197, #199, #200; dependencies #196 and #198.

## Current state
The existing ActivityMediaService persists private proposals and encrypted scanned candidates, with version mapping and revocation. Candidate read and publication remain disabled. The 25-reference pack is verified locally but not imported into a qualified durable private host. This PR starts as a draft; no new runtime functionality or acceptance is claimed by this document.

## Implementation contract
- [ ] Extend the existing lifecycle with immutable approved media references bound to exact center, activity version, step, reference digest and derivative, with separate verified evidence for rights and clinical review. Do not promote quarantined candidates by default.
- [ ] Implement authorized retrieval through the application, checking current membership, center, version, revocation and, for guardians, the existing release/access policy on each request. No public object URLs, no cross-center reads, no stale access after revocation. Fail closed if evidence or storage is absent.
- [ ] Connect the approved catalogue thumbnail and optional numbered step illustrations to the read model. Preserve accessible alt text, loading/error/placeholder behavior, specialty filters, responsive grid/list and dark/RTL behavior. Do not infer step congruence from style or scene.
- [ ] Calculate coverage from the actual active published activity/version inventory, excluding unapproved, missing or revoked mappings from the numerator; disclose zero-denominator cases.
- [ ] Add adversarial API, mounted component, browser and storage/retention tests; retain all eight coverage floors and six required exact-head checks. Update all four handover records before review readiness.
- [ ] Record real private-host import, rights, clinical signatures and human accessibility evidence separately. No real patient data, paid service provisioning, public image bytes, clinical release or G2/G2b activation is authorized by this PR.

## Qualification
Implementation, tests, CI, independent review, hosted import and human acceptance are NOT RUN at draft creation. Keep roadmap issues open until their actual definitions of done are satisfied. No claim of 100% published image coverage.


## 2026-11-24 — PR C private mapping integrity slice (qualification pending)
Current-version staff snapshot now remounts on center/template/version changes, discards old in-flight results, rejects malformed or duplicate slot inventories and reports proposed/scanned slot coverage separately from approved illustration coverage. Mounted adversarial regressions added. This is a preparatory slice only: approved persistent references, secure retrieval, catalogue/guardian rendering, actual published inventory coverage, private host import and signed evidence remain outstanding. Exact-HEAD CI/review NOT RUN at commit creation. No release or read gate changed; G2/G2b NO-GO.


## 2026-11-24 — PR C persistent signed artwork evidence foundation (qualification pending)
Previous `242ece8` CI 45462902053 and focused Web 45462902555 PASS; Codex exact HEAD clean. Added additive Prisma approval evidence table/migration, independent purpose-bound Ed25519 signature verifier, current-version staff-only verified receipt metadata endpoint, and signature tampering/key configuration tests. No HTTP approval writer, private image byte read, guardian delivery, release authority or actual signature provisioning; trusted evidence onboarding and storage/derivative delivery remain outstanding. CI and review NOT RUN at commit creation. The new trust-key design is proposed engineering infrastructure, not verified legal/clinical identity or approval policy. G2/G2b NO-GO.


## 2026-11-24 — PR C signed staff preview and immutability correction (qualification pending)
Codex P2: add existing governance_immutable UPDATE/DELETE trigger to approval evidence migration. Signed staff preview retrieves only an exact current-version/slot candidate after fresh scope verification and draft/candidate locks, authenticates encrypted bytes, verifies PNG structure/digest/dimensions, sends no-store response. Staff catalogue whole-activity/numbered-step opt-in previews use ephemeral object URLs and actor/version remount; no prefetch or guardian/public URL. Adversarial boundary and mounted tests added; previous full CI still in progress at inspection, new exact-head tests/review pending. Operational signature onboarding, actual host import, published inventory and guardian protected release delivery remain unimplemented; do not enable clinical release. G2/G2b NO-GO.


## 2026-11-24 — PR C CI contract repair and immutable-receipt regression (qualification pending)
Focused Web run 45465518702 failed on two old exact JSX signature assertions; updated both contracts to retain the layout checks and explicitly verify the staff-only scoped preview, no family exposure and ephemeral URL cleanup. Added real PostgreSQL integration regression (actual revoke endpoint; receipt UPDATE/DELETE rejected, evidence retained). Added staff receipt inventory coverage with whole-activity/numbered-step counts, nullable zero-denominator percentage, explicit unavailable published coverage. No clinical/guardian publication or rights onboarding added. Latest CI and review pending; prior full run was in progress. G2/G2b NO-GO.


## 2026-11-24 — PR C synthetic family illustration binding and reporting (qualification pending)
Corrected Codex P1 numeric route regex and added controller regressions. Added separately gated TB_FAMILY_ARTWORK_SYNTHETIC (default off), frozen artwork manifest in newly approved synthetic PLAN rendering only, exact server snapshot/current signed receipt matching, recipient-specific eligibleRead reuse, no-store image and per-authorized-plan coverage endpoints, private family UI previews. Historical releases are not silently enriched; no production or clinical GO. Coverage is recipient-plan scoped, not global catalogue coverage. Render workspace checked: TheraBridge demo free web service, no durable custody disk; no connected Desktop Commander device. Actual archive import and verified independent evidence remain NOT RUN; no paid infrastructure provisioned. New exact-head CI and review pending.


## 2026-11-24 — PR C integrated coverage remediation (qualification pending)
Previous exact HEAD 33bb777 focused Web 45466482546 PASS and Codex receipt clean; full run 45466482975 test failed solely at integrated eight-floor gate (API branches 87.15%, Web branches 89.26%; web 2026/2026 tests PASS). Added adversarial signed-receipt, current-source inventory, recipient release, revocation, malformed manifest and mounted family/staff image branch regressions. No gate changed. Prior P1 numeric route correction and P2 immutable database receipt tests present; pending exact-head qualification. Global coverage and operational import remain outstanding; no paid host provisioned or synthetic flag enabled.


## 2026-11-24 — PR C centre-wide released synthetic artwork coverage (qualification pending)
Previous `37ec29b` focused Web and integrated test/browser jobs passed; exact-head Codex clean, preview CI running at inspection. Resolved earlier P1 numeric and P2 immutable receipt threads after verifying code and passing integration job. Added supervisor-only centre aggregate over ACTIVE synthetic plan grants, recipient policy revalidation, deduplication by approval and activity version, every eligible occurrence must have readable pinned image, no aggregate IDs/bytes, nullable empty denominator and no partial percentage for >50 grants or invalid source. Added on-demand scoped staff UI and API/mounted adversarial tests. This is centre-scoped synthetic reporting, not platform-wide production coverage; bounded inventory limit is explicit. No hosted private artwork import or actual evidence, no release gate activation. Exact-head CI/review pending.


## 2026-11-24 — PR C private R2 adapter (qualification pending)
Previous 813e19a full CI 45469429647 and focused Web 45469429734 PASS. Owner reported private demo R2 bucket and five runtime environment variables configured; values not inspected. Added bounded SigV4 R2 ciphertext GET, explicit conditional PUT operator helper, additive immutable candidate pointer migration and authenticated signed staff/family retrieval with no DB fallback on remote error. Separate operator CLI promotes already scanned exact-reference candidates with write-scoped keys, full read-back through runtime read-only credentials, scoped recheck and DB backup retained for separately governed retention. No actual network import, deployment, signatures, master/derivative custody or scanner execution claimed. Existing G2/G2b and synthetic flags unchanged. New CI/review pending. No new third-party dependencies.

### R2 operator import (already-scanned candidate review copies only)
Runtime configuration: TB_R2_BUCKET=therabridge-demo-media, TB_R2_ENDPOINT (account S3 endpoint), TB_R2_REGION=auto, TB_R2_ACCESS_KEY_ID and TB_R2_SECRET_ACCESS_KEY (bucket-scoped Object Read only). No public bucket URL. On a separate trusted private operator host use the same read-only runtime keys for verification, distinct short-lived bucket-scoped Object Read & Write credentials as TB_R2_IMPORT_ACCESS_KEY_ID/TB_R2_IMPORT_SECRET_ACCESS_KEY, TB_PRIVATE_DATA_KEY_B64 and authorized synthetic DATABASE_URL from secret storage. Set TB_ARTWORK_R2_IMPORT_ALLOWED=true and explicitly set DEPLOYMENT_ENV=demo. Apply the reviewed migration before using the CLI.
From apps/api with dependencies installed and Prisma generated:
```sh
pnpm exec ts-node --transpile-only src/cli/stage-artwork-r2.ts <existing-scanned-candidate-uuid>
```
This copies only the already scanned encrypted review PNG, not the 25-source master pack. The operator must first stage the exact pack through the existing private ClamAV custody flow and register reviewed candidates through scoped app intake. On failure reconcile the deterministic ciphertext object and DB pointer before retry; no automatic delete. Runtime reads enforce existing receipt, authorization and revocation checks and fail closed on remote storage errors. Remove/revoke temporary write credentials after verification. Database ciphertext retained pending separate retention/backup policy.


## 2026-11-24 — R2 CI branch-coverage remediation (qualification pending)
Exact 0309151 CI 45471907227 failed solely at measured API branch floor 89.07% (minimum 90%); all 1,908 API tests and 2,072 web tests passed, other eight-metric results except API branches passed, focused Web 45471907251 passed. Smart CI gate failed downstream. Exported the existing guarded operator entrypoint for direct testing without changing its checks. Added precondition, scope, scan, digest/dimension, credential separation, success, idempotence, concurrent revocation/pointer conflict and storage outage regressions with mocked DB/storage boundaries; expanded missing-config tests. No threshold/CI policy changes, no live import. Exact-head CI/review pending.
