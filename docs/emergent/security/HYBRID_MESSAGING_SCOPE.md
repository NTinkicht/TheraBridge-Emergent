# TB-EM-012 — Hybrid operational messaging scope (synthetic-only)

**Status:** implementation draft; verification required. This is not clinical, safeguarding, privacy-policy, pilot, or release approval.

Owner-selected direction (updated 2026-10-22): guardians discuss operational matters **only with therapists actively assigned to their child**. Clinical supervisors have **no discussion access**. Center administrators and coordinators may coordinate internal staff threads only; they have no access to family conversations. Specialty threads remain restricted to authorized therapists for the specific child and specialty.

| Audience | Guardian | Therapist | Clinical supervisor | Center manager |
| --- | --- | --- | --- | --- |
| `GUARDIAN` | Only exact active recipient link for active child | Active assignment to the child; may close/reopen thread | No access | No access |
| `CARE_TEAM` | No | Any active assignment to the child; cannot close/reopen | No access | Center scope; may close/reopen |
| `SPECIALTY` | No | Active assignment to the specific (child, specialty); cannot close/reopen | No access | Center scope; may close/reopen |

A therapist who loses one specialty but retains another immediately loses that specialty's thread access while retaining the child's general coordination threads. Thread lists, detail reads and replies use the same authorization predicate. Staff may not send internal threads to guardians; a guardian may not initiate or see internal threads. Managers cannot initiate or manage guardian-addressed conversations, and clinical supervisors cannot create, list, view, reply to, or manage any discussions. The existing guardian-addressed API remains backward-compatible through default `GUARDIAN` audience. All new threads use an immutable audience; this is not an editable classification.

**Operational content only.** Messages are not the place for assessments, diagnoses, clinical observations, safeguarding reports or other protected clinical notes. Those remain in separately authorized clinical resources.

**Fail-closed D-NEW-5 boundary (M2-S01):** all server routes for free-text conversation listing, detail/history, thread creation, replies, and status changes are **DENY in every deployment**, including local development and hosted synthetic previews. `center.messages.use` and `.manage` are not granted in deployed permission responses. Only isolated Jest tests may exercise legacy synthetic fixtures when **all** of `NODE_ENV=test`, `DEPLOYMENT_ENV=ci`, a Jest worker, and `FAMILY_MESSAGING_DEMO=true` are present. The flag alone can never activate messaging; enabling real/pilot use requires separately signed safeguarding, custody, consent, emergency escalation and privacy policy decisions plus a future reviewed implementation. The UI remains disabled. No real child or family data is permitted.

The owner has resolved the **synthetic message-participant scope** only; safeguarding issue #35 / D-NEW-5, formal informed permissions/privacy review for actual deployments, and recipient-release decisions remain unresolved. Retain NO-GO for clinical/pilot/production use.

Implementation includes Prisma migration `20261029090000_tb_em_012_hybrid_operational_threads` and synthetic end-to-end access checks. Independent review and successful exact-head CI are required before inclusion in the controlled import. Do not merge unrelated repository histories.
