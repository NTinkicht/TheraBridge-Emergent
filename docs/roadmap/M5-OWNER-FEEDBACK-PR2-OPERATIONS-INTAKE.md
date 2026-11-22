# M5 owner-feedback package 2/5 — Operations, intake and permissions (draft)

Predecessor: PR #461 merged into main at `a88d5cdd15e894387138807f339694d4a6790102`.
Owner register: `docs/roadmap/M5-OWNER-MANUAL-FEEDBACK-20261122.md`.

## Ordered scope

| Observation | Desired user outcome | Current implementation boundary |
|---|---|---|
| 04 | Custom recurring visits | Existing validated weekly interval 1–4 and 26-week/60-visit caps: surface custom 3–4 week options, preserve booking/series parity. Monthly or arbitrary-pattern recurrence would require separate backend/API specification |
| 09 | Center contact phone + email | Requires versioned tenant schema, server validation, downstream read/write and audit. Do not fabricate local-only saving |
| 10 | Job title vs role clarity | Personal job-title text editable, roles remain admin-granted |
| 11 | Condition/allergy/medication intake | Sensitive child information: requires approved M6/M9 clinical schema, access control, consent, audit; NO-GO until approval |
| 13 | Optional child photo | Consent, private storage, scan, signed URL, rights and retention: NO-GO until approval |
| 14 | Child row quick actions | Link only to authorized existing child/family destinations; do not introduce an unguarded message action |
| 27 | Specialty/responsibility role grants | Read-only in self-profile, admin-managed changes only; server authorization and formal owner decision need explicit review before altering active grants |

## Delivery conditions

- One shared design system; no screen-only or role-only hacks; check every consumer.
- Five widths (320/390/768/1024/1440), role boundaries, keyboard navigation, light/dark, RTL where relevant.
- New/changed APIs require tenant and actor authority checked on server, negative/adversarial tests; no clinical gates enabled.
- All eight Web/API measured coverage metrics remain >=90%, full exact-head CI green, independent final-head Codex review.
- Every suggestion gets FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON. Four AGENTS.md Rule 7 handover records must be kept current.
- This draft plan is NOT an approval of owner-gated clinical, consent, privacy or authorization policy work.

## Current checkpoint
Planning draft only. **NOT IMPLEMENTED / NOT TESTED / NOT REVIEWED / NOT MERGEABLE FOR RELEASE.**
