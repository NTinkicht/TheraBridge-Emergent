# TB-EM-045 — Clinician care-journey navigation and synthetic acceptance

## Purpose

The existing Child 360° overview now offers a coherent four-stage, internal **non-clinical navigation** path: (1) plan goals and version history, (2) measurements and goal-specific evidence, (3) permissioned saved report and statement evidence, (4) internal draft home-plan activities and scheduling. Both goal and home-plan stages deliberately reuse the existing authorized Plan tab rather than fabricating a second workflow.

The journey is only a front-end navigation affordance. It reads current plan-version metadata, clinician goals, source-bound observations and draft activities from the already authorized `Workspace`. Goal/observation counts match by **planVersionId + goalKey**; superseded/withdrawn versions cannot inflate current counts. Appointment status, practice feedback, family messaging and unrelated historical observations are not counted as clinical progress. Report versions and review status are NOT included in the child workspace, so this navigation never invents them and loads the existing reports tab under its own permissions.

## QA and limits

- Pure test: current plan/goal/activity counts, source-bound observations, excluded old version/source and orphan goal, absent guessed report counts.
- Seven-role synthetic Chromium: all four navigation controls switch to correct plan/progress/reports section, retain the exact child URL and permit returning to Child 360, with existing five responsive widths and role gates.
- No API, auth guard, DB, clinical note, report, goal, activity or release mutation; no new patient-facing content.
- This is a synthetic user journey integration test, **not** external hosted acceptance. Hosted issue #61 remains independently gated, including cookie inspection, real hosted browser dimensions and additional browser families.
- Require independent P0–P2 review, exact-head six-job CI and no open review threads before merge. Actual family clinical release, signing, consent, safeguarding, provider AI/STT and pilot require independent policy decisions.

## Integration order

PR #105 is prepared on the same stable merge base as independent Slice 14 (#103) and Slice 15 (#104). Those PRs may merge first; re-evaluate exact-head source and CI after base updates. Do not merge an unqualified stacked change.
