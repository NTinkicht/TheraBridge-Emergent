# TB-EM-012 — Hybrid operational messaging scope (synthetic-only)

**Status:** implementation draft; verification required. This is not clinical, safeguarding, privacy-policy, pilot, or release approval.

Owner-selected direction: allow operational care-team coordination, restrict specialty-specific threads to authorized specialties, and allow guardians to see only conversations explicitly addressed to their active guardian link.

| Audience | Guardian | Therapist | Clinical supervisor | Center manager |
| --- | --- | --- | --- | --- |
| `GUARDIAN` | Only exact active recipient link for active child | Any active assignment to the child | Center scope | Center scope |
| `CARE_TEAM` | No | Any active assignment to the child | Center scope | Center scope |
| `SPECIALTY` | No | Active assignment to the specific (child, specialty) | Center scope | Center scope |

A therapist who loses one specialty but retains another immediately loses that specialty's thread access while retaining the child's general coordination threads. Thread lists, detail reads and replies use the same authorization predicate. Staff may not send internal threads to guardians; a guardian may not initiate or see internal threads. The existing guardian-addressed API remains backward-compatible through default `GUARDIAN` audience. All new threads use an immutable audience; this is not an editable classification.

**Operational content only.** Messages are not the place for assessments, diagnoses, clinical observations, safeguarding reports or other protected clinical notes. Those remain in separately authorized clinical resources.

**Fail-closed deployment boundary:** all free-text messaging depends on `FAMILY_MESSAGING_DEMO=true` in a synthetic local/CI environment; staging/production always deny it, including historical reads. This feature flag is NOT approval for real-family messaging.

Unresolved: safeguarding issue #35 / D-NEW-5, informed permissions/privacy review for actual deployments, and recipient-release decisions. Retain NO-GO for clinical/pilot/production use.

Implementation includes Prisma migration `20261029090000_tb_em_012_hybrid_operational_threads` and synthetic end-to-end access checks. Independent review and successful exact-head CI are required before inclusion in the controlled import. Do not merge unrelated repository histories.
