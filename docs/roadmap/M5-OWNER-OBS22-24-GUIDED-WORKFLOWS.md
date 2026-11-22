# M5 owner feedback 22–24 — combined clinical workflow PR

## 22 · Assessment guidance
Specialty-specific, factual prompts in the existing authorized draft form. These are **not clinician-approved protocols**, diagnoses, AI findings, validation outcomes or release permissions. No form data is generated from prompts. Live form/API remains authoritative.

## 23 · Guided plan/report draft setup
Shared two-step keyboard-accessible navigation in both creation forms (identity/specialty, then period or draft creation). Existing fields remain mounted, preserving in-progress values and route-based keyboard/browser workflows. The established versioning/autosave and approval gates are unchanged. A complete multi-screen wizard with saved intermediate server states and owner acceptance is **not** claimed; this PR establishes a safe, incremental setup guide.

## 24 · Separate categories of practice feedback
The staff feedback page now visually and semantically separates practice answers, handover requests, and family plan requests using distinct, labeled sections. The existing backend authorization and real endpoints are preserved; no cross-category aggregate is introduced.

## Acceptance / restrictions
Exact-HEAD 90% coverage floors, full CI, Codex, role/keyboard/five-width UX checks remain required. Clinical G2/G2b signing/release NO-GO unchanged. Do not mark observations 22–24 fully owner-accepted solely because this PR merges.
