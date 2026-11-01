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

These values are represented in `apps/api/src/clinical/transfer-development-policy.ts` with isolated synthetic tests in `apps/api/test/transfer-development-policy.e2e-spec.ts`. This module **does not** authorize any clinical operation or mutate assignments. The development-only decision engine in `apps/api/src/clinical/transfer-synthetic-workflow.ts` models version-bound acceptance, clinical approval, open-item dispositions, scope denial, proposal expiry, emergency fallback, temporary-coverage handback, seven-day scheduled-session review, and per-unit blocked batch outcomes. A second, *separately gated* synthetic PostgreSQL path now exposes `synthetic-approve` and `synthetic-commit` on operational proposals and atomically swaps one assignment only when `HANDOVER_DEMO=true`, `TB_TRANSFER_SYNTHETIC_EXECUTE=true`, deployment is non-production/non-staging, the center slug begins `synthetic-`, the relevant active roles are checked, and there are **zero** guardian links, clinical notes, reports, plans, appointments, or message threads for the assignment. This path is deliberately not available for clinical use. It is covered by `apps/api/test/transfer-synthetic-workflow.e2e-spec.ts`. The pure decision model is not yet connected to the synthetic PostgreSQL workflow; it still defines the pending full clinical rules.

The following approvals remain OPEN: clinical governance, DPO, safeguarding lead, security owner, legal counsel; formal PD-06 agreement; and G2/G2b, G3–G7 activation gates. The existing TB-EM-049 operational proposal/acknowledgement and TB-EM-050 readiness APIs remain non-authorizing. No transfer endpoint, assignment mutation, clinical access or report/plan release is allowed from them.

## Remaining implementation

1. Extend the currently narrow synthetic PostgreSQL path to persist version-bound full proposals, open-item dispositions, time-boxed preview and clinical decision provenance. The guarded clean-assignment demo path is not equivalent to full clinical authorization.
2. Integrate modeled temporary coverage, handback, emergency escalation, scheduled-session disposition and per-child/specialty atomic batch outcomes with authorization-aware persistence; follow OD-1–OD-8.
3. Design transaction concurrency, lock order, tenant isolation, idempotency-after-authorization and immutable audit before any executable feature gate.
4. Add denial, cross-tenant, revocation, rollback, stale proposal, guardian restrictions and multi-role synthetic tests.
5. Obtain exact-head six-job CI and independent code review before marking the PR ready; obtain separate signed approvals before any clinical activation.

## Acceptance gate

**NOT COMPLETE / NOT TESTED AS A WHOLE.** Development defaults are provisional; the clinical transfer lifecycle and professional authorizations are outstanding. Keep clinical activation disabled and TB-EM-053 family release out of scope.
