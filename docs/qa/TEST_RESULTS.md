# Test results — TB-EM-015 / issue #58

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
