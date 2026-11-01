# M3-STT01 — Controlled speech-to-text architecture and workflow

**Milestone 3 item 2/7. Planning-only opening checkpoint — NOT IMPLEMENTED / NOT TESTED.**

Predecessor **M3-AI01** PR #153 merged into `main` as `a9202bdb323154810597ccfc4dd5fb031b685512` after exact-head six-job CI, P2 resolution, and Codex review of `dcc1d44`.

## Approved next development slice

1. Inventory the existing synthetic session dictation/transcript workflow, generated sample provenance, and seven-role server boundaries.
2. Design an STT provider abstraction with a disabled production provider and a deterministic **offline synthetic audio/transcript fixture**; no microphone upload, external API or real patient audio.
3. Implement bounded transcript correction and explicit language, pause/resume/stop, network-recovery state contracts with synthetic tests while preserving draft-only clinician review.
4. Add tenant/child/specialty and active-assignment authorization tests for any eventual session integration; never authorize processing merely from a UI flag.
5. Document audio lifecycle, minimum storage, privacy risk and API/processor contract as **PROPOSED**; no real-audio capture or external transcription before accountable owner D2/PD and provider authorization.
6. Run six CI jobs, independent exact-head reviews, and disposition all comments before merge.

## Safety boundary

No actual patient data, microphone access, media upload/retention, external STT provider, clinical signing/release or production activation is authorized. Keep all existing clinical and real-audio gates closed. This document is the opening scope only; implementation and qualification remain **NOT STARTED**.
