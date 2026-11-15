# M5-01 browser observations — isolated synthetic route and viewport tranche

**Status: IN PR, NOT QUALIFIED.** This is executable CI capture instrumentation, not a completed visual or accessibility audit. Tracks #184 after merged source-audit PR #380.

## Explicit tested scope

Existing `scripts/design/run-demo-live.mjs` creates an empty disposable `*_demo_test` loopback PostgreSQL database, seeds ten synthetic users with fresh in-process random passwords, runs pre-existing seven-role browser journeys and real two-session handover, then starts the M5-01 Playwright observer using the original seven persona identities. It does not touch hosted Render/Neon.

The observer validates all seven synthetic account roles, then loads five permitted task-entry pages per persona at widths **320, 390, 768, 1024, 1440px** (175 observations). It records local route render/redirect/error state, presence of main and primary navigation landmarks, document width versus viewport width, a screenshot SHA-256 and a nonapproval status. Screenshots are captured to an isolated temporary directory and **deleted immediately after the run**, without uploading pixels, browser storage, cookies, passwords or DOM text. CI only uploads a fixed-schema numeric/enum JSON receipt. The companion adversarial tests reject missing/duplicated entries and forged usability/clinical approvals.

A successful automated route observation says **only** that a particular synthetic role/browser viewport was visited; it does not validate the user's actual task, success, keyboard focus, screen-reader accessibility, dark theme or human visual appearance. Screenshot status is `CAPTURED_NOT_REVIEWED`; artifact image count is zero by design.

## Evidence acceptance boundary

- **May be reported after exact-head CI**: 175 automated route/viewport attempts, observed overflow flags, structured route outcomes, role login verification and transient screenshot hashes.
- **Still NOT RUN**: screenshots inspected by a human, screenshot-to-step annotations, five complete timed tasks per role (rather than five page entries), keyboard and screen-reader checks, low bandwidth / dark theme checks and owner-approved UX remediation.
- Any nonrendered route, overflow flag or absent landmark is **an investigation candidate**, not a fabricated product bug or automatic PASS.
- The CI script never uses real patients, modifies clinical governance, bypasses G2/G2b or turns policy BLOCKED into PASS.
- After real measurements, a separate M5-01 audit closeout and M5-02 information architecture backlog may proceed; keep #184 OPEN until then.

## Reviewer gates

Require six full exact-head original CI jobs, Smart CI, SBOM and an independent Codex review with zero unresolved findings before merging. The roadmap M4-02 #176/#268 hosted acceptance and M4-09 #183 historical reconciliation remain independent obligations.
