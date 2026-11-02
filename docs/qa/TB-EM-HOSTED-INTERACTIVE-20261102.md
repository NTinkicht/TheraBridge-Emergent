# Hosted synthetic interactive QA — 2026-11-02

Status: IMPLEMENTED IN DRAFT PR #160 — syntax parsed; hosted execution NOT RUN. Pending CI, independent review and manual protected workflow dispatch.

## Scope
Extend the existing private seven-role Playwright QA runner to exercise **read-only interactions** on the fixed synthetic Render host. Reuse the protected `TB_HOSTED_QA_USERS_JSON` secret and preflight. Verify exact deployed SHA through the owner-verified Render deploy ledger, not from an untrusted input alone.

1. Seven independent authenticated role sessions and identity/context checks.
2. Role-appropriate navigation by clicking actual sidebar links.
3. Non-mutating scheduling view controls and open/cancel booking dialog.
4. Open/cancel child registration dialog (authorized staff only).
5. Therapist clinical navigation and guardian practice availability without changing records.
6. Keyboard-focus, dialog dismiss, authorization-denial, and logout assertions.
7. Redacted, secret-free structured per-step evidence, with FAIL/BLOCKED distinction and no personal screenshots.
8. Preserve 104-case historical baseline; do not promote screenshots or shallow interactions to clinical acceptance.

## Safety
No patient data, no appointment creation, no clinical draft submission, no signing/release/consent changes, no real audio or external AI. Never print tokens, passwords, cookies, URLs containing parameters, or sensitive page text. Restrict the browser runner to the exact fixed HTTPS Render origin. Manual-only GitHub Actions execution, protected environment, ephemeral credentials, and credential cleanup.

## Qualification
JavaScript syntax parse passed on 2026-11-02. Six exact-HEAD repository CI jobs, independent review, and an explicitly operator-dispatched hosted run are required before asserting any hosted PASS. Any finding must be fixed or separately tracked before merge per AGENTS.md Rules 13–18.
