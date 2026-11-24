# M5 WU2-F — Genuine illustrated activity pilot, coverage and acceptance

**Predecessor:** WU2-E PR #491 merged into main as `9449a4ba00824814fbf59942bbf6caa6d94620e7`.

**Roadmap:** M5-17 #200, together with required approval dependencies M5-12/13/14/15/16 (#195–199) and final UX qualification M5-11 #194.

## Scope / finish line

1. Establish the **real activity publication denominator** from a versioned release model (currently **not present** in `ActivityTemplate`). Do not divide by all stored templates or extrapolate from sample data; mark denominator **UNKNOWN**, not zero or 100%.
2. Inventory **actual separate 1600×1200 masters** for the locked `m5-b-v1` 25-concept matrix, matched to genuine active activities and owned approved activity versions. Do not substitute 320×240 concepts, placeholder tiles, synthetic samples or planning receipts.
3. Pilot **20–30 real distinct activities** across five families/archetypes only when genuine records and independently approved images exist. Broader 50–100 expansion is conditional on the actual source inventory.
4. Independently verify each master, 4:3 derivative and center-safe crop, actual ClamAV operational scan, encrypted private storage/key rotation/retention and deletion, rights/provider/attribution, human design/clinical approval, activity/step version and meaningful localized alt.
5. Perform authorized staff and family user tests at 320/390/768/1024/1440, light/dark, keyboard, screen reader, low bandwidth, no-image fallback and revocation. Record actual redacted screenshots/owner signoff without storing real patient data in the repo.
6. Only an **independently authorized later release** can permit approved images in an activity catalogue or guardian plan. Clinical G2/G2b remain NO-GO until separate signed governance approvals. Do not expose quarantined candidates to public routes.

## Latest verified facts, not simulated acceptance

- Merged #485–#490 deliver the 25 accepted-as-reported concept reference set, deterministic private production master planning/admission/derivative checks, scanner/encrypted local custody, proof binding and metadata inventory.
- Merged #491 provides staff-only semantic numbered text steps with 4:3 **NO IMAGE** placeholders. All image URLs are intentionally null. No new media read route or approved-media model exists.
- The actual 25 production master image files are **NOT PROVIDED**; no genuine commercial provider run receipts, clinically identity-verified asset-specific design/rights/clinical signatures, independently qualified production S3/AV/backup/key rotation, true published activity denominator or human/AT final acceptance are available in source.
- Accordingly current reported percentage of approved/published illustration coverage is **NOT MEASURABLE**, not 100%. The existing `scripts/qa/m5-media-inventory.mjs` returns this truth with synthetic isolation. Do not invent QA passes.

## Work unit boundaries

**Engineering now:** reconcile the canonical inventory receipt with actual DB state and identify missing release-schema/rights/approval prerequisites; build a digest-locked, non-public pilot receipt validator with synthetic adversarial tests and clear NOT_VERIFIED states; maintain the six exact-head CI jobs and eight >=90% API/Web coverage gates.

**Cannot be completed without external evidence:** production illustration generation, live secure storage operator proof and independent legal/clinical/design/AT/owner acceptance. No autonomous policy activation, release flag, upload of actual child images or invented proof. This work unit must remain **BLOCKED_FOR_EXTERNAL_APPROVAL** on those gates until verifiable receipts are attached.

**Handover:** all four state/work/next/QA evidence files, owner-specific remaining actions, exact test/CI SHA and manual review records. Issues #200 and required dependencies must stay open until genuinely satisfied.


## WU2-F engineering implemented in this PR (CI qualification pending)

`scripts/qa/m5-wu2f-pilot-readiness.mjs` implements `buildSyntheticIllustrationPilot` and `validateBlockedPilotReceipt`:

- **Consistent real DB metadata, synthetic isolation:** reuse `buildSyntheticMediaInventory` inside the *same* `RepeatableRead` PostgreSQL transaction as center-owned `ActivityTemplate` `{id,centerId,version,service}` matching. Read **only** isolated `DEPLOYMENT_ENV=ci` and localhost `*_demo_test` databases. Global sample templates are counted separately and cannot be proposed as center-owned pilot activities. If sources disagree or an orphan/unsafe private candidate exists, fail instead of reporting a misleading count.
- **Canonical reference identity:** reconcile through WU2-D `reconcileProductionAssets` from SHA-pinned `m5-b-v1` 25-slot batch. Operator-reported private-bundle receipts are labeled **not independently verified** even at 25/25. There is no remotely readable master, public asset URL or fallback-to-approved.
- **Exact version/scope matching:** optional metadata-only `pilotProposals` must contain the same center, existing current activity template version, a distinct template ID, and a distinct 25-slot reference matched to the **persisted** specialty-to-family mapping. Feeding→occupational, developmental→behavioral. Group is an unresolved visual taxonomy, not an invented persisted clinical service. A later release model and clinician must validate each *scene/action match* independently; matching the family does not verify technique suitability.
- **20–30 requested pilot vs current 25 slots:** the current reference set can plan at most **25 distinct image references**. A 26–30 unique-art pilot needs separately versioned/approved additional activity-specific artwork. Pilot proposal count is **not** a clinically eligible/published activity count.
- **No release promotion:** every receipt has `publishedActivityCount=null`, `publishedIllustrationCoveragePercent=null`, `reportedPilotEligibleActivityCount=null`, `approvedReleaseModelPresent=false`, `canStartClinicalPilot=false`, `publishEnabled=false`, `guardianReadEnabled=false` and `clinicalGate=NO_GO_G2_G2b`. Even 20 exact synthetic candidate records and 25 allegedly quarantined masters cannot override these. No client route, signed-approval service, production upload or release token exists.
- **Private, bounded integrity record:** only aggregate counts, per-scene/family counts and a SHA-256 inventory/receipt digest escape the synthetic checker. The digest is explicitly **not a signature** and verifies only local integrity; no UUIDs, activity titles, child/patient data, images, rights sources, object paths or private keys are serialized. Reject extra/accessor fields, duplicate/stale/foreign entries, malformed arrays and altered report approvals.
- **CI:** blocking `node --test scripts/qa/m5-wu2f-pilot-readiness.test.mjs` added to original full `demo-journey`, alongside the unchanged six mandatory exact-head jobs and eight ≥90% API/Web coverage thresholds.

## Owner and independent verifier inputs still necessary

| Phase | Owner / independent authority | Evidence needed | Current state |
|---|---|---|---|
| Real activity denominator | Clinical product owner + DB/release authority | Versioned active/published activity semantics, center scope, signed release identities, migration/consent safety review | **OPEN — do not guess from `ActivityTemplate` count** |
| Real 1600×1200 originals | Authorized illustrator or licensed model operator | Distinct original image bytes, per-run rights/model terms, SHA-256, matched instructions and character continuity | **NOT PROVIDED** |
| Verified media lifecycle | Independent security/privacy + legal hold authority | Actual host AV negative controls, S3 private tenancy, encryption/key rotation, restoration, retention, deletion and WORM audit | **NOT QUALIFIED** |
| Clinical/design/rights | Independent identified approvers | Exact asset/version/model/run/license digest signatures, pose/anatomy/congruence checks, human-audited translations and alt | **NOT PROVIDED** |
| Pilot accessibility | Authorized users and assistive-technology evaluators | Real 320/390/768/1024/1440 results, keyboard, screen reader, light/dark, low bandwidth, empty/error, revocation, printable view | **NOT RUN** |
| Clinical/public release | Named owner and release authority | G2/G2b signed policy GO plus rights/privacy clearance and per-center grants | **NO-GO** |

### Test command / handover

Run `node --test scripts/qa/m5-wu2f-pilot-readiness.test.mjs` for entirely synthetic mocked-DB fixtures. The production script itself refuses non-CI local demo databases. The CI run must additionally pass *all* exact-head required checks and the independent reviewer with dispositions before merge. Passing this suite proves only that **blocked pilot planning is not mistakenly reported as approved coverage**, not that the pilot actually happened.
