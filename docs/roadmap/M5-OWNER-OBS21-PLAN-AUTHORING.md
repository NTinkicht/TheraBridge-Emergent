# M5 owner observation 21 — therapy-plan authoring clarity

Source: the frozen 32-item owner feedback register, observation 21. This PR is independent from the existing collapsed evidence/calendar changes merged in PR #467.

## Implementation
- Three accessible, version-scoped authoring landmarks for summary, goals and home activities.
- 44-pixel touch and keyboard links scroll to *mounted* controls; no steps are conditionally unmounted and unsaved edits remain intact.
- Existing save, optimistic version conflict, role permission, review, consent and clinical NO-GO restrictions are unchanged.
- Regression tests ensure same-version targets, unsigned draft saving and read-only behavior.

## Acceptance
- Full exact-HEAD CI and eight 90% API/Web coverage thresholds, independent Codex review, keyboard/AT and five-width owner verification required.
- Owner observation 21 remains **owner-acceptance pending**, even if this PR merges.
