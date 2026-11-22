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
