# TB-EM-046 — Milestone 1 synthetic acceptance ledger

**Work item:** #106. **Base dependency:** Draft PR #105 (integrated clinical journey) plus merged PRs #103 and #104. **Evidence source:** real CI jobs for exact HEAD only; do not cite another commit's success as qualification.

## Internal test coverage added in this slice

1. Source chain (pure regression): exact current plan v2/goal, evidence observation v2, internal therapist-authored home activity and its version-frozen definition; superseded v1 percent goal and v1 observation remain separate; saved report source from v1 is **not** reattributed to v2 even when the goal key is identical. No result is called clinically effective, accurate, released or approved.
2. Responsive real-browser check: synthetic assigned Speech therapist enters Child 360 and the already-existing four-stage navigation is visible, focusable and not clipped at 320, 390, 768, 1024 and 1440px. Existing seven-role clinical/API isolation, latest goal evidence, report source and home-plan checks remain in the unchanged test suite.
3. Report comparison: source date/ID/value and exact goal version differences are inspection flags only. No clinical validation performed. The existing saved internal report snapshot and clinician note/version tests remain required.

## Exit gate matrix

| Gate | Status at authoring | Evidence required to call PASS |
| --- | --- | --- |
| API and PostgreSQL real synthetic tests | NOT RUN at this branch HEAD | exact-head CI `test` job success |
| Source/version pure acceptance | NOT RUN at this branch HEAD | exact-head `check-child360-logic.mjs` success |
| Seven-role browser journey | NOT RUN at this branch HEAD | exact-head `demo-journey` success |
| Five viewport widths | NOT RUN at this branch HEAD | exact-head browser geometry assertions success |
| Docker Compose and preview health | NOT RUN at this branch HEAD | exact-head `compose` and `preview-container` success |
| Secret scan and live session | NOT RUN at this branch HEAD | exact-head `secret-scan` and `live-session` success |
| Independent P0–P2 review | NOT RUN at this branch HEAD | reviewer verdict on unchanged exact HEAD with zero unresolved threads |
| Hosted live external browser/cookie acceptance | BLOCKED/INCOMPLETE | separate issue #81 external-hosted runner and user-authorized hosted evidence, not synthetic CI |
| Clinical authorization, consent and family release | NO-GO | separate owner-approved policies and implementation |
| Real AI/STT, production/pilot and real patients | NO-GO | separate future governance and launch decisions |
| Per-plan activity duration override | OPEN separate development scope | validated API/schema or JSON DTO, UI editor, exact saved snapshots and tests; avoid coupling to acceptance-only PR |

**Exit definition:** All six internal CI jobs green, independent review clean and no unresolved comments make this slice technically mergeable; they do not mean external hosted QA or clinical governance is complete. Product readiness must retain those explicit NO-GO/blocked rows.
