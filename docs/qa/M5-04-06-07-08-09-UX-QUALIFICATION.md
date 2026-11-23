# M5 shared UX qualification — PR #481

**Date:** 2026-11-23 · **Issues:** #187 (M5-04), #189 (M5-06), #190 (M5-07), #191 (M5-08), #192 (M5-09). **Baseline:** #480 merged at `main@b39c6cad90c31f74b5a4a61a841e04ce1c16390a`.

## Change inventory — actual code

| Workstream | Implemented in PR #481 | Non-claims |
|---|---|---|
| M5-04 shared UX/tokens | Official light/dark semantic `brand.actionOn` token instead of fixed white on lightened dark action fill; shared Button semantics; source-executed AA contrast test; responsive 44px control improvements. | An automated token ratio is not a human contrast/visual signoff. |
| M5-06 therapist | Optional fictional drafting assistance behind native keyboard-accessible disclosure; core clinical sections, autosave, conflict and evidence remain visible and unchanged. Repeated activity reorder/remove controls now have distinct spoken labels and accessible instruction summary. | No automatically approved report, signed note, clinically verified synthetic proposal or release. |
| M5-07 coordinator/admin | Calendar day/week controls now 44px and contrast-paired; schedule remounts on center/membership/role change and ignores late old-center child directory responses. Existing timezone/recur-scope and booking guards unchanged. | No automatic recurrence edit or silent appointment mutation. |
| M5-08 supervisor | Review context disclosure is a 44px target with visible keyboard focus; source-bound review queue and family-message exclusion retained. | No approval of signing, family messaging or clinical release. |
| M5-09 guardian | Three-sibling selection gets a polite atomic status announcement and explicit link to the current child detail panel; child detail keyed by exact child id. Five-width real-browser light and dark technical observation added. | Sibling visibility is from authorized server projection only; no pending document is represented as released. |

## Automated evidence (true only if exact-HEAD CI succeeds)

- Existing **M5 WU2** isolated PostgreSQL + Playwright browser run: therapist, coordinator and supervisor, each at 320/390/768/1024/1440px (15 role/viewport observations). Verify focusable role-specific search, role markers, accessible main, keyboard skip, horizontal overflow; coordinator day/week target minimum 44px and pressed-state; supervisor no family-message exposure. Screenshot buffers are SHA-256 hashed **in memory**, not saved.
- New **M5 shared guardian** isolated Playwright run: guardian at the same five widths, for BOTH native light/dark theme toggle states (10 transient screenshot hashes), root/background/ink computed AA contrast, one main landmark, keyboard skip, atomic screen-reader status region, sibling switch if synthetic seed includes more than one child, and horizontal overflow. Result is a strict primitive-only JSON receipt. When seed includes only one child, report sibling browser interaction `NOT_APPLICABLE_IN_SEED` instead of inventing a three-sibling test.
- Mounted source-executing test simulates **three distinct linked siblings** and asserts switch-controlled detail, announcement and no stale previous-child visit. Coordinator mounted test simulates late old-centre directory response after centre change and membership reassignment. Source-executing WCAG ratio test verifies staff actions against both official palettes. Existing report autosave/clinical and guardian regression suites remain mandatory.
- Artefacts: `/tmp/therabridge-m5-wu2-browser-qualification.json` (existing), `/tmp/therabridge-m5-shared-guardian-ux.json` (new technical), `/tmp/therabridge-m5-shared-ux-human-pending.json` (explicit NOT_RUN). All private, numeric/enum-only outputs; no screenshot bytes, patient names, credentials or source text.

## Human acceptance — still required (NEVER auto-approved)

Use only the **synthetic demo** with actual permission-appropriate roles. At **each of five widths**, test each of the four role workflows below in loading, empty, error, blocked and success states. This gives **100 role×width×state cases**, each requiring five checks (`keyboard`, `screenReaderManual`, `contrastManual`, `focus`, `overflow`) = **500 human checks**. A generated matrix contains 500 `NOT_RUN` values and cannot qualify until a human performs and records them.

| Role | Task to execute | Negative/boundary check |
|---|---|---|
| Speech/OT therapist | Today → scheduled session → observed activities and goal version → save draft → review report evidence and start a plan handoff | Concurrency/failed save must retain text; cannot sign or release; repeated Move/Remove buttons spoken unambiguously |
| Coordinator / center admin | Agenda/date and therapist filter → appointment details → recurring edit-scope and timezone → review internal exceptions | Switch between two authorized centers mid-search, ensure no stale child/booking data, verify denied operations |
| Clinical supervisor | Review queue → evidence/source preview → comments/return decision → follow-up | Cannot access family messages; cannot perform therapist-only edits or clinical release |
| Guardian | Switch **three synthetic linked siblings** → upcoming appointment → sample practice → approved-only documents → authorized messaging | Revoked/suspended link denies previous child, no unapproved report exposure, inspect both dark/light themes and RTL readiness |

### Human test protocol (capture real results, not assumptions)

1. Load each exact role/width/state scenario on an approved synthetic, **non-clinical** environment, including browser zoom 200%, reduced motion and slow/network-failure conditions. Use the real theme toggle before first interaction, then repeat dark/light. Do not paste tokens or child data into artifacts.
2. **Keyboard only:** Tab, Shift+Tab, Enter, Space, Arrow/Home/End on tabs and combobox, Escape/close, modal focus restoration and skip-to-main. Record failures, focus trap/overlap and target sizes; do not infer success merely from an `aria-*` attribute.
3. **Screen reader:** Actual NVDA+Chrome/Firefox on desktop and VoiceOver+Safari on mobile, or equivalent assisted qualified manual observations; confirm headings, tab labels, changing sibling announcements, appointment/date readout, errors and blocked reasons. Playwright DOM checks are **not** a substitute for this step.
4. **Visual:** inspect 320, 390, 768, 1024, 1440px, RTL readiness, both themes, 200% zoom, loading/empty/error/blocked/success. Save only sanitized/redacted screenshots to an approved controlled evidence store; include before/after paired screen identifiers and reviewer notes, not raw screenshots in the public repository.
5. **Real usability:** collect paired baseline and PR #481 task results against M5-01 with actual role-appropriate participants. Measure completion success, genuine task time and errors. Target **≥95% task success** and **≥30% median time reduction where measured**, with **≥20 paired samples per task/viewport** under existing `synthetic-task-benchmark.mjs` policy. Unknown results stay `NOT_RUN`, not zero or PASS.
6. Obtain named human accessibility/usability reviewer, owner signoff, and CI/reviewer receipts **on the final exact HEAD**; cross-check all affected screens rather than calling one isolated screenshot a global fix.

## Acceptance trace / gating

- Technical browser, source, full API and Web coverage, Smart CI, SBOM, secret-scan, container and mandatory reviewer CI must be independently green at exact HEAD.
- No closeout for #187/#189/#190/#191/#192 on automatic technical receipts alone. Manual 500-check evidence, six-job qualification and owner acknowledgement remain independent.
- No real child data, image publication, real audio STT, clinical signing, consent bypass or G2/G2b GO. Existing clinical gates remain **NO-GO**.

## Final status discipline

**Implementation in PR #481: IN_PROGRESS until CI qualified.**  
**Automated five-width evidence: NOT_OBTAINED until exact-head browser job passes.**  
**Human NVDA/VoiceOver, five-width visual, task-timing and owner acceptance: NOT_RUN.**  
**Public clinical/family release: NO-GO.**
