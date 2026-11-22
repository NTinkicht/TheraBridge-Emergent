# M5 owner-feedback package 2/5 — Operations, intake and permissions (draft)

Predecessor: PR #461 merged into main at `a88d5cdd15e894387138807f339694d4a6790102`.
Owner register: `docs/roadmap/M5-OWNER-MANUAL-FEEDBACK-20261122.md`.

## Ordered scope

| Observation | Desired user outcome | Current implementation boundary |
|---|---|---|
| 04 | Custom recurring visits | IMPLEMENTED IN BRANCH: custom numeric 1–4 week interval with client/server bounds, series summary parity, mounted tests and browser CI; monthly recurrence remains outside existing API |
| 09 | Center contact phone + email | IMPLEMENTED IN BRANCH: additive nullable Prisma migration, tenant-scoped versioned API, validated empty clearing, audit, center form, Jest/PostgreSQL/browser tests; final qualification pending |
| 10 | Job title vs role clarity | IMPLEMENTED IN BRANCH: explicit accessible profile guidance, personal title remains editable; no authorization changes |
| 11 | Condition/allergy/medication intake | GATED — owner approval in [#463](https://github.com/NTinkicht/TheraBridge-Emergent/issues/463): clinical data dictionary, least privilege and consent before storage |
| 13 | Optional child photo | GATED — owner approval in [#464](https://github.com/NTinkicht/TheraBridge-Emergent/issues/464): consent, private quarantine, scanning, retention and revocation |
| 14 | Child row quick actions | IMPLEMENTED IN BRANCH: link to existing child profile; guardian anchor only when center-scoped child already has guardian; no new message/release capability |
| 27 | Specialty/responsibility role grants | GATED — authorization decision in [#465](https://github.com/NTinkicht/TheraBridge-Emergent/issues/465) before self-service grant behavior can change |

## Delivery conditions

- One shared design system; no screen-only or role-only hacks; check every consumer.
- Five widths (320/390/768/1024/1440), role boundaries, keyboard navigation, light/dark, RTL where relevant.
- New/changed APIs require tenant and actor authority checked on server, negative/adversarial tests; no clinical gates enabled.
- All eight Web/API measured coverage metrics remain >=90%, full exact-head CI green, independent final-head Codex review.
- Every suggestion gets FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON. Four AGENTS.md Rule 7 handover records must be kept current.
- This draft plan is NOT an approval of owner-gated clinical, consent, privacy or authorization policy work.

## Current checkpoint
**IMPLEMENTED BUT NOT QUALIFIED:** Four of seven owner observations (#04, #09, #10, #14) have production code and automated test definitions committed; final exact-head CI, measured coverage, final independent review and real owner visual/AT acceptance remain **PENDING/NOT RUN**. Sensitive #11/#13 and authorization-policy #27 remain **GATED**, with no phantom form saves, image publication, or self-grants. This PR remains an engineering draft until those gates are dispositioned. The signed clinical G2/G2b NO-GO remains unchanged.
