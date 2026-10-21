# Non-blocking issues to file on GitHub (TB-EM-001)

Emergent cannot create GitHub issues. Please file each one, or let a reviewer do it. GitHub #3 and #4 already exist and were deliberately not addressed.

| # | Severity | Title | Reproduction | Proposed fix |
|---|---|---|---|---|
| N1 | Low (preview only) | The edge proxy rewrites cookie SameSite to `None; Partitioned` | `curl -i https://therabridge.preview.emergentagent.com/api/auth/csrf`: the API sends `SameSite=Lax`, but the response shows `SameSite=None; Partitioned` | None needed in code. Session-bound CSRF and Origin checks still apply. Re-verify on the real deployment |
| N2 | Medium (preview only) | Preview client IP resolves to a Cloudflare edge IP | Failed logins on the preview record a Cloudflare /24 prefix in `audit_event.ip_prefix`. All preview users may share the per-IP limit of 30 per 15 min | Production must set `TRUSTED_PROXY_CIDRS` to its own proxy chain. Optionally support a trusted `CF-Connecting-IP` header when behind Cloudflare |
| N3 | Low | The common-password deny-list is small (about 40 entries) | `apps/api/src/auth/common-passwords.ts` | Bundle a larger list (for example the top 10k at 12+ characters) or check breaches with k-anonymity |
| N4 | Low | The account lockout can be triggered by anyone who knows an email (15-minute DoS) | 5 bad logins for a known email | Accepted risk for V1. Later: progressive delays, or CAPTCHA after the lockout |
| N5 | Low | Fixed one-minute buckets make the 15-minute window approximate | `rate-limit.store.ts` | Acceptable. Switch to a sliding log, or a Redis store behind `RateLimitStore` |
| N6 | Low | `audit_event` is append-only only in application code | No DB trigger | Phase 5: add a DB trigger or privilege separation (already planned) |
| N7 | Info | The testing agent added `tests/test_therabridge_auth_api.py` (pytest against the preview) | Root `tests/` folder | Keep it as an external smoke test, or move it under `apps/api/test/` |
