# TB-EM-052 — Authorized Therapist Transfer and Clinical Handover

Milestone 2 ordered item 11/12. Approval prerequisite: [#115](https://github.com/NTinkicht/TheraBridge-Emergent/issues/115) (TB-EM-051 policy signoff). Predecessor: merged M2-QA01 PR #147 (`90a127e05278b30ccec0304b95c0912c0e99717f`).

## Status: PLANNING ONLY — NOT IMPLEMENTED, NOT TESTED, NO AUTHORIZATION

- Operational acknowledgement and manager readiness from TB-EM-049/#111 and TB-EM-050/#113 are **non-authorizing**. They must not grant the incoming therapist access to child records, transfer assignments, or imply a clinical decision.
- The private V0.9.16 `transferCaseload` candidate is **unsigned**. G2/G2b remain NO-GO. Do not expose a transfer endpoint, chain ordinary assignment APIs to bypass approval, seed/mutate transfer records, change clinical access, or activate signature/release functionality.
- Blocking signed decisions are tracked in #115: D10/PFR-CT-01 open-item dispositions, OR-15 proposing/approving/committing/witness roles, OR-16 scope-before-idempotency/retry semantics, D7 consent, historical/per-specialty clinical scope, D-NEW-5 safeguarding owner, D4 guardian grant scope, D1 signer/step-up, atomic version/locks/audit/revocation.

## After accountable human approval (separate executable authorization required)

1. Record immutable signed policy versions/hashes and approving authorities without patient data.
2. Reconcile the canonical `POST /api/v1/assignments/transfers` specification with current NestJS API conventions; never expose the duplicated candidate admin route.
3. Design transactional propose → approve → witness → commit workflow with fail-closed open-item disposition and assignment-version checks; no admin clinical access.
4. Add denial, cross-tenant, consent, revocation, concurrency/rollback and audit tests, plus synthetic multi-role browser handover verification.
5. Revalidate exact-head CI and independent review before any future authorized executable PR merge.

## Acceptance gate

**BLOCKED by #115 signed clinical authorization.** No executable transfer implementation or clinical release is permitted from this planning checkpoint. Scope separation from TB-EM-053 protected family release remains mandatory.
