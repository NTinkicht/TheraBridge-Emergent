# M5-12–17 — ordered media and illustration dependency chain

**Starting point:** merged PR #481 / main `41b751b6713c9a65825ad6c1a324b8f96de4a04b` (2026-11-23).

## Non-negotiable order

1. **M5-13 (#196) illustration style standard:** Direction B semi-flat editorial reference set, 4:3 master, 1:1 safe crop, five specialty families, five scene archetypes, anatomy/prop/safety, no real-child likeness/copyrighted characters. Keep `docs/product/ILLUSTRATION_STANDARD_V1_DRAFT.md` **NOT APPROVED** until actual named owner + independent design + clinical review receipts for the exact reference board revision. Human judgment is not simulated.
2. **M5-14 (#197) media security, integrity, rights & lifecycle:** current private draft/quarantine pipeline is operational **only for isolated encrypted/scanned candidate staging**, with neither reader nor publication endpoint. Require independently verified security and legal/rights decisions tied to the candidate digest, license/provider terms and exact activity/template version; preserve centre/author grants, malware scan, PNG integrity, no-read quarantine, revoked candidate invalidation and history. No client-submitted `license` string constitutes a rights signoff.
3. **M5-12 (#195) image-first catalogue:** keep 4:3 unavailable-image fallback until the server possesses a **separately reviewed immutable approved media projection**. UI cannot treat the private draft or quarantined candidate as public. Keep search, filters, grid/list, keyboard and specialty text labels.
4. **M5-15 (#198) controlled generation:** briefs use one frozen style+reference set and approved commercial terms; validate provider/license, safety, no protected person/character, full prompt/seed/cost provenance, hash and human design+clinical reviews. Generated assets remain private until independent release.
5. **M5-16 (#199) step illustrations:** each image bound to numbered steps, exact source activity/version and approved source snapshot, matching characters/materials/technique; localized meaningful alt text and accessible/printable fallbacks. No automatic family step-image release.
6. **M5-17 (#200) pilot & inventory:** pilot 20–30 only if genuine distinct active activity records exist across five families/scenes; scale 50–100 only if inventory justifies. Every **actually published** activity must have an accepted illustration, verified 4:3 and square-safe derivatives, immutable version/checksum, rights and clinician+design approvals, accessibility, image-loading QA, and revocation behavior. Report the real denominators, zero/unknown explicitly; do not count text-only placeholders as published images or mislabel all database templates as clinically published.

## Current facts / explicit blockers

- `ActivityTemplate` has **no active/published status field**. A count of stored templates is **not** proof of active published activities. Synthetic sample templates (`centerId=null`) are not centre-owned.
- `ActivityMediaDraft` schema restricts to `DRAFT/REJECTED`. No approved artwork snapshot/immutable approved read model exists.
- `PrivateMediaCandidate` is encrypted and quarantined with `rightsState=UNVERIFIED`, `status=QUARANTINED` and no public URI; source/terms are proposals, not legal decisions.
- Current reference guide is **NOT APPROVED**. No genuine reviewer signatures, reference images, provider contract clearance or public-release consent records have been provided. **No clinical GO is available** (G2/G2b remain NO-GO).
- Consequently **M5-12/15/16/17 release qualification is BLOCKED**, not falsely marked DONE. This is an honest gating condition pending human review and subsequent runtime model integration.

## PR deliverables / verification

- Explicit fail-closed, testable approval/dependency ledger and cryptographic evidence verifier for *offline audit*, not a runtime approval shortcut; external reviewer trust anchors mandatory and no embedded private keys.
- A synthetic database inventory receipt directly querying canonical `ActivityTemplate`, `ActivityMediaDraft` and `PrivateMediaCandidate`, counting centre/global templates separately, current-version drafts/candidates, quarantined/revoked counts and absent approved image coverage, with no child, user, IDs, image paths or private bytes in artifacts.
- Rejecting draft imagery revokes any quarantined candidates within the same authorized DB transaction, preventing older private candidates from lingering as eligible review inputs.
- Adversarial tests and exact-head Smart CI/full coverage gates; update all four handover/QA records.

## Manual approval evidence required to proceed

| Gate | Required qualified reviewer / proof | Status |
|---|---|---|
| Style v1.0 reference board | Owner, design and clinician approve *same immutable style/board digest* | **NOT APPROVED** |
| Media threat model/storage | Independent security + privacy reviewers accept scan, encryption, no-read delivery, revocation, lifecycle | **NOT APPROVED** |
| Rights and provider terms | Named legal/rights approver accepts each actual asset digest, scope, attribution and permitted AI use | **NOT APPROVED** |
| Asset QA | Design and clinician verify each exact image and technique; localized alt, 4:3 / square crop | **NOT RUN** |
| Pilot & full coverage | Actual per-center inventory, pilot 20–30, all genuinely published assets, controlled browser visual/AT/low-bandwidth review | **NOT RUN** |
| Final clinical/public release | Separate G2/G2b governance decisions and explicit release authority | **NO-GO** |

Never write fake reviewer signoffs, imply software-generated signatures represent named people, or move any quarantined media into family/catalogue delivery without actual approved runtime enforcement.
