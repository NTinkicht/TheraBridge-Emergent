# TB-EM-053 — Protected Family Plan and Report Release

Milestone 2 ordered item 12/12. Predecessor: merged synthetic-only TB-EM-052 checkpoint [PR #151](https://github.com/NTinkicht/TheraBridge-Emergent/pull/151), squash commit `e5d9711af7cd7a5af05bbff7288297a212238229`.

## Status: IMPLEMENTATION IN PROGRESS — SYNTHETIC-ONLY FOUNDATION; NO RELEASE PATH ENABLED

**Owner source of truth:** [TB-EM-053 v1.1, private policy PR #48](https://github.com/NTinkicht/TheraBridge/pull/48), merged and approved by the owner for development and synthetic testing on 1 November 2026, FR-1 through FR-9. Professional attestations remain pending and G2/G2b NO-GO, G3 NOT AUTHORIZED, G4–G7 NO-GO remain unchanged. TB-EM-052 full executable transfer remains independently blocked by #115.

### Foundation implemented in this PR

- `family-release-policy.ts` provides a pure, fail-closed decision model: independent synthetic environment and center flags, tenant/child scope, clinical authority, recipient identity, per-guardian restrictions, purpose consent, safeguarding, exact rendering fingerprint, grant version, revocation and withdrawal.
- Additive Prisma migration defaults center synthetic release to **off**, guardian restriction to **UNRESOLVED**, and records release kind, purpose, approved rendering fingerprint, releaser and revocation metadata on `RecipientRelease`. Existing blocked grants remain blocked; no external release endpoint is introduced.
- `family-release-policy.e2e-spec.ts` exercises policy denial and allowed synthetic decision scenarios.
- `family-release-rendering.ts` constructs a strict family-only plan/report rendering from whitelisted fields and hashes the **rendered bytes**, excluding internal notes, raw evidence and safeguarding content; isolated tests prove the projection and version-sensitive hash.
- `SyntheticFamilyApproval`, `SyntheticFamilyConsent`, and `SyntheticFamilyGrant` preserve the historical trigger-locked clinical release tables, with a dedicated additive migration. Authenticated API methods now support synthetic-only clinician snapshot approval, guardian consent/withdrawal, recipient grants, explicit release changes, guardian no-store list/view and capture-only notifications. All methods check both server environment and center flags.
- `family-release.e2e-spec.ts` covers the PostgreSQL workflow, per-guardian isolation, revocation after consent withdrawal, center flag denial, clinician assignment revocation and supersession.

**Still to implement and independently verify before changing PR state:** final CI/database verification of the new end-to-end workflow, explicit conflict/race and seven-role regression journeys, UX integration, signed clinical policy activation outside the synthetic environment (separately owner-gated). Synthetic approvals are intentionally marked `signed: false`; they do not purport to be D1 clinical signatures. Do not confuse this synthetic workflow with authorized real-patient release.

## Proposed scope after accountable authorization

1. Reconcile approved D7 purpose-specific guardian consent, D4 household restrictions, D-NEW-5 safeguarding holds and D1 signatures/step-up with existing Reports/Plans/Releases/Grants/Consent boundaries.
2. Define immutable provenance for clinician-signed clinical snapshots and per-recipient permitted release scopes; admin rights never grant clinical content access.
3. Implement atomic, version-bound authorization checks and revoke-capable recipient grants, ensuring tenant/child/specialty/purpose scope before any replay/idempotency result.
4. Test denial, stale versions, concurrent release/revocation, wrong household, blocked guardian/safeguarding cases, retry semantics, audit and full synthetic seven-role journeys.
5. Run six exact-head CI jobs and independent final code review. Never equate synthetic acceptance with clinical authorization or production deployment.

## Acceptance / activation boundary

**Development and synthetic testing are owner-approved under PR #48.** Production clinical activation remains disabled pending named clinical-governance, privacy/DPO, safeguarding, security and legal attestations and a separate owner activation decision. No real-patient release is authorized.
