# M5 owner-feedback package 3/5 — Clinical drafting UX

Source: `docs/roadmap/M5-OWNER-MANUAL-FEEDBACK-20261122.md`; follows merged PR #462.

## Current implementation slice

- **16 — task-oriented therapist landing:** authorized child selection now opens with a specific task description rather than a vague workspace heading. No new authorization, clinical action or backend query.
- **17 — historical sessions collapsed:** only `COMPLETED` records enter the optional disclosure; active `IN_PROGRESS` editors stay mounted regardless of history visibility. The disclosure advertises state and a stable target; completed editors inherit their existing read-only semantics.

## Remaining PR3 register (not claimed complete)

- **15:** exact versioned goal/plan navigation and target changes — preserve immutable provenance and current M6 semantics.
- **18–19:** image-first activity selection, keyboard alternative, progressive configuration; use only approved available imagery, never bypass private rights controls.
- **20:** keep synthetic dictation developer controls clearly separate from real clinical workflow; no STT activation.
- **21–23:** plan disclosures, specialty guidance, guided draft-only report/plan flows with save/resume and conflict-version controls.
- **24:** separate feedback/plan requests and staff handover without changing access boundaries.

## Qualification / non-claims

- Existing 90% (eight API/Web branch/function/line/statement) coverage floors and six required CI jobs are unchanged. Full exact-HEAD CI and final independent review are mandatory.
- Synthetic 5-width cross-role browser, manual keyboard/AT, owner acceptance and task-success evidence are **NOT YET VERIFIED**.
- No patient release, signing, clinical approval, STT or unapproved media publication; G2/G2b remains **NO-GO**.
- This is a partial engineering implementation, not closure of observations 16–17 or milestone M5.

## Follow-on implementation — owner observation 21 (progressive plan disclosure)

- The editable version summary, goals, activity configuration, save and review actions remain visible and mounted.
- Supporting plan evidence, saved family preview, goal checkpoints and home-practice calendar use native, keyboard-accessible collapsed disclosures. Their component trees remain mounted when the disclosure is closed, preserving existing local state and avoiding silent remounts.
- The unchanged current-version, version-history and immutable evidence semantics remain in place. No write, submit, sign or family release occurs on disclosure.
- Added mounted synthetic tests for default collapsed state, draft save version integrity, read-only roles and locked release actions.
- **NOT QUALIFIED:** Five-width role-by-role visual and assistive-technology checks, owner acceptance, exact-HEAD CI and independent review remain required. This slice does not close observation 21 or the broader PR3 work.

## Follow-on independent slice — observation 20: synthetic transcription separation

- Added a native keyboard-accessible collapsed developer-testing disclosure around the existing **synthetic-only** transcription component in each owned clinician session.
- The entire Dictation component remains **mounted even when collapsed**, retaining unsaved transcript, the parent's pending-navigation guard, remote completion safety, and explicit insertion rules. A disclosure toggle is not a discard or an insert.
- A clear notice distinguishes fictional fixture transcription from real clinical recording; no microphone APIs, external speech services, consent, audio upload, signing, patient release or STT activation are added.
- Updated live browser synthetic session and multi-tab tests to deliberately expand the developer disclosure; added mounted regression tests for default collapsed presentation, draft saving and completed-session access revocation.
- Scope is **only a developer-control UX separation**; observation 20 owner acceptance, five-width per-role screenshots, manual keyboard/AT and full exact-head review/CI remain pending. Do not interpret the implementation as real STT availability or M5 closure.

## NEXT DRAFT — observation 15: versioned goal/plan navigation (NOT IMPLEMENTED)

Predecessor: #468, merged as `3830366822705944c14c051ef0d6932f4aaa8c3b`.
Owner observation 15: “Progress charts need goal/plan links and versioned target changes.”

- Inspect existing progress visualization, goal version identities, plan relationship and M6 target semantics before changing any read or write path.
- Add exact-version deep links from progress charts to the relevant authorized goal/plan, preserving immutable historical records and enforcing current-role/tenant access server-side.
- Any target edit must create or use the approved versioned update flow; never silently overwrite a historical target or retroactively change chart meaning.
- Test synthetic therapist/supervisor/guardian denied journeys, stale versions, cross-tenant/cross-child references, keyboard/mobile link behavior, reload, back navigation and other shared views using the same chart component.
- Retain all eight ≥90% code coverage floors, full exact-HEAD CI, independent review, five-width visual and manual AT/owner acceptance; G2/G2b clinical release/signing remains NO-GO.

**Status: PLANNING ONLY — NOT IMPLEMENTED, NOT TESTED, NOT QUALIFIED, NOT READY TO MERGE.**
