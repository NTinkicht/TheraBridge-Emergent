# M5-01 — Narrow automated keyboard navigation and route-settling measurements

**Status: implemented on PR branch, NOT qualified until exact-head CI and independent review.** This document extends merged M5-01 source/viewport foundations #380 and #381. It neither closes #184 nor confirms visual or assistive-technology acceptance.

## Executed scope, once the synthetic CI job succeeds

The existing isolated ten-account demo harness continues to seed a disposable loopback `*_demo_test` PostgreSQL database and use seven role personas. Its baseline performs five page-entry route visits per persona at 320, 390, 768, 1024 and 1440 px (175 observations). Each now includes **automated route settling elapsed milliseconds**; these are machine measurements, *not actual task-completion times*. Browser timing can vary by CI runner and cannot be used as a production SLA.

After each persona's 25 route entries, a separate read-only, keyboard-triggered safe path is tested:

1. At 1440 px navigate to that persona's permitted second route, focus the desktop Home anchor, press **Enter**, confirm a settled `/app` screen and record machine-only elapsed milliseconds.
2. At 320 px focus the native mobile navigation select; press **Shift+Tab** and observe whether focus reaches the header's Sign out control. Preserve `OBSERVED` or `NOT_OBSERVED` as measured, not universal WCAG approval.
3. Focus the Sign out button, press **Enter**, confirm redirect to local `/login` and then close the isolated role context. No clinical mutation is performed.

A strict, negative-tested receipt requires exactly seven distinct role journeys with observed desktop, mobile and sign-out focus; disallows forged `PASS`/clinical approval and the storage of passwords, cookies or DOM text. The numeric-only M5-01 browser JSON artifact remains safe to archive. Temporary screenshot pixels are erased; no real account credentials or patient records are copied into receipts. G2/G2b stays NO-GO.

## Limitations and next acceptance work

- **NOT DONE:** human visual screenshot review or archived images, real timed five-task-per-persona workflows, screen-reader announcements, contrast and focus-visible visual checks, accessibility conformance, low bandwidth behavior, family light/dark visual comparison and independent UX owner approval.
- A working direct keyboard action does **not** mean the full page or every workflow is keyboard accessible.
- A mobile reverse-Tab observation of `NOT_OBSERVED` must remain visible in evidence and be triaged, not silently converted to PASS.
- Keep #184 OPEN until the separately approved private visual, accessibility, and real-task execution reaches its acceptance gate.
- Preserve M4-02 #176/#268, M4-09 #183 and all protected clinical release restrictions.

## PR qualification

Merge only after six required exact-head CI jobs, SBOM, Smart CI, full independent Codex final-head review, and resolution of all P1/P2 comments. Do not alter Render demo, secret stores or shared clinical databases.
