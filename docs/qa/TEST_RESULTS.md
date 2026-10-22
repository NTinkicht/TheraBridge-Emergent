# Test results — TB-EM-015 / issue #58

## PR #59 repair verification — 2026-10-22

Correction checkpoint atop 7e366fb53a471b28f58255987eb018c7804b478e. The containing commit is the corrected candidate; the owner-authorized managed-Git export handoff reports its exact SHA and remote/PR-head verification. Local results below do not establish hosted CI.

- PASS: frozen Yarn install; API/web typechecks and production builds after final source edits.
- PASS: PostgreSQL full suite **457/457, 12/12 suites** (122.044 s), including concurrent starts, payload/actor conflicts, revoked replay, legacy first entry/completion, cross-day saves and DST offsets.
- PASS: responsive DOM at 320/390/768/1024/1440; legacy empty-start inline error/edit/save/reload/completion; delayed disabled controls/re-enable; tab-discard/completion unload guard cleanup. Browser API fixtures, not a new live backend journey.
- PASS: real 15-migration baseline + original synthetic legacy note → session migration, content/null start/unsigned status preserved.
- PASS: redacted gitleaks scan of tracked working-tree export including the new disposition document; git diff --check.
- BLOCKED: Docker daemon socket access; hosted exact-head CI and authenticated PR response/re-review request.
- NOT RUN: new live browser/API journey, Safari/Firefox, physical audio. Dev preview backend setup unavailable after restore; no usable full-stack review preview claimed.
- OPEN: authorized start correction policy; fail-closed until decision, completed immutable trigger preserved.

Details: [PR dispositions](../../artifacts/tb-em-015/PR59-DISPOSITION.md).

## Original implementation verification

Base main: f49ade4125cdb26e11fd7eb2cc80c292a48f00a9. Branch: freebuff/tb-em-015-session-workflow.

- PASS: frozen-lockfile install (Node 20.19.0 / Yarn 1.22.22), Prisma generate.
- PASS: API typecheck; PostgreSQL integration suite **453/453 tests, 12/12 suites**, final full run 158.218 s; Nest build.
- PASS: web typecheck, Next production build.
- PASS: fresh migration chain (16 migrations); baseline upgrade with pre-existing synthetic session-note content preserved.
- PASS: DOM tests at 320/390/768/1024/1440 with synthetic API fixtures, keyboard activity insertion, synthetic dictation success and 7 error scenarios, cancellation/retry, editable review/insertion, unsaved warning, denied-save preservation, no false save success, completed read-only.
- PASS: real login/browser/API/PostgreSQL ad-hoc session journey, activity result, reviewed synthetic transcript, autosave/reload/resume and completion/read-only reload; no API mocking in that journey.
- PASS: gitleaks 8.30.1 all-ref history scan (87 commits before feature commits), values fully redacted; no leaks. Final staged-export scan recorded in artifacts/tb-em-015/VALIDATION.md.
- BLOCKED: Docker Compose build/smoke: daemon socket permission denied. No bypass attempted.
- NOT VERIFIED: actual STT recognition/device capture (disabled), Safari/Firefox/device tests, Figma frame access, GitHub exact-head CI, Mistral independent findings.

See [implementation evidence](../emergent/workunits/TB-EM-015.md) for exact commands, initial failures repaired and boundaries. No production deployment or clinical activation.
