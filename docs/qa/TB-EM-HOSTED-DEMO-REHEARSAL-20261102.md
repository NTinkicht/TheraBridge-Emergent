# TheraBridge synthetic stakeholder demo — rehearsal checklist (2026-11-02)

Audience: Children's Home Rehabilitation Center. Hosted service: https://therabridge-ahmed-synthetic-demo.onrender.com

## Guardrails

- Use **only** the seven existing synthetic accounts via the protected private runner. Do not expose credentials, screenshots of personal data, or session tokens.
- This is a non-clinical prototype demonstration. Do not sign, approve, release, create a real patient record, capture real audio, enable external models, or present sample progress as actual outcomes.
- The 104-case acceptance baseline is historical and unchanged; 35 screenshot/dialog cases were not formally accepted by layout review. The hosted interactive smoke run 41451350004 produced 43 PASS / 0 FAIL / 14 intentionally BLOCKED.
- The existing clinical UI says “Media capture and AI processing are not available.” Do not promise a live generative AI interaction.

## Presenter order and talking points (approx. 12 minutes)

1. **Center administration (3 min):** log in as center admin; show the center setup and team, children list, schedule. Open and cancel (without submitting) the synthetic child registration and booking dialogs. Explain assignment and role boundaries.
2. **Therapist / clinical workspace (4 min):** sign in as assigned speech therapist; open the first assigned **fictional** child, show Child 360°, Therapy plan, Assessments, Sessions, Progress, Reports. State clearly that nothing can be signed or released. Demonstrate source-traced report assistance only as a deterministic preview if the panel exists; do not send a generation request.
3. **Guardian experience (3 min):** log in as guardian; show family activities and home practice; show “Progress updates” with the explicit **Sample only** banner and fictional values. Explain that unreleased clinical reports are not shown.
4. **AI architecture (2 min):** explain the implemented offline deterministic fixture/provider seam and source-traced draft scaffolding. Show the clinical banner disabling live AI processing. External provider invocation, real audio transcription, independent clinical decision-making, and release remain disabled. Do not imply they were exercised end-to-end.

## Rehearsal pass criteria

- Login uses the exact expected role, logout revokes the session.
- Every demonstrated route renders success or legitimate empty state without forbidden/error.
- At least one assigned synthetic child can be opened by therapist; all six tabs respond and the no-AI banner is present.
- Guardian progress sample renders with its explicit sample label.
- No browser errors, mutating submits, protected actions, or sensitive artifacts.
- If there are no seeded child assignments, record BLOCKED and arrange a separate authorized synthetic seed fixture; never silently call it PASS.

## Evidence and next steps

The private workflow `.github/workflows/hosted-interactive-private.yml` invokes `scripts/qa/hosted-interactive.mjs`, now including demo child-tab and family-progress rehearsal assertions. It runs only after protected GitHub environment approval and independently verified live Render SHA. It preserves per-step PASS/FAIL/BLOCKED distinctions and one-day artifact retention.

After run: investigate any FAIL as test-runner versus app defect. Keep clinical and AI production gates NO-GO.
