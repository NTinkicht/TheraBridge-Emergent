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
