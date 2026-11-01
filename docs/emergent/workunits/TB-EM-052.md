# TB-EM-052 — Authorized Therapist Transfer and Clinical Handover

Milestone 2 item 11/12; predecessor M2-QA01 #147. Owner policy: [private TheraBridge PR #47](https://github.com/NTinkicht/TheraBridge/pull/47), merged 1 Nov 2026, version 1.1. Owner decisions OD-1 through OD-8 approved; separate professional attestations remain pending.

## Status: DEVELOPMENT IN PROGRESS — CLINICAL ACTIVATION BLOCKED

Owner approved **provisional synthetic-development** values on 1 Nov 2026:

| Parameter | Development default | Formal PD-06 approval |
|---|---|---|
| P-1 | Planned guardian notice 7 calendar days ahead | Pending |
| P-2 | Coverage expiry alerts at 7 days, 24 hours, 1 hour | Pending |
| P-3 | Proposal expires after 7 calendar days | Pending |
| P-4 | Emergency session horizon 7 calendar days | Pending |
| P-5 | Handover preview at most 48 hours | Pending |

These values are represented in `apps/api/src/clinical/transfer-development-policy.ts` with isolated synthetic tests in `apps/api/test/transfer-development-policy.e2e-spec.ts`. This module **does not** authorize any clinical operation or mutate assignments. Its date calculations are not wired to an executable clinical transfer workflow.

The following approvals remain OPEN: clinical governance, DPO, safeguarding lead, security owner, legal counsel; formal PD-06 agreement; and G2/G2b, G3–G7 activation gates. The existing TB-EM-049 operational proposal/acknowledgement and TB-EM-050 readiness APIs remain non-authorizing. No transfer endpoint, assignment mutation, clinical access or report/plan release is allowed from them.

## Remaining implementation

1. Build synthetic-only transfer lifecycle with version-bound proposal, receiving acceptance, clinical approver decision, open-item disposition and time-boxed preview. Require fail-closed access scope and role rechecks at every action.
2. Model temporary coverage, handback, emergency escalation, scheduled-session disposition, and per-child/specialty atomic batch outcomes; follow OD-1–OD-8.
3. Design transaction concurrency, lock order, tenant isolation, idempotency-after-authorization and immutable audit before any executable feature gate.
4. Add denial, cross-tenant, revocation, rollback, stale proposal, guardian restrictions and multi-role synthetic tests.
5. Obtain exact-head six-job CI and independent code review before marking the PR ready; obtain separate signed approvals before any clinical activation.

## Acceptance gate

**NOT COMPLETE / NOT TESTED AS A WHOLE.** Development defaults are provisional; the clinical transfer lifecycle and professional authorizations are outstanding. Keep clinical activation disabled and TB-EM-053 family release out of scope.
