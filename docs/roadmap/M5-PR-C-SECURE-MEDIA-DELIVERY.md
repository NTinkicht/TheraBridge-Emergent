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
