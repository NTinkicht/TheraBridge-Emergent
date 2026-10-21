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
| N8 | Low | Application submissions count against the per-network limit even when they fail (409 duplicate) | Submit 5 duplicates, then a valid application returns 429 | Kept deliberately (limits email probing). Document it, or count only successful submissions |
| N9 | Low | The applications status tabs scroll sideways at 390px without an edge cue | `/app/applications` on mobile | Reuse the design-preview `ScrollStrip` (chevrons and fade) |
| N10 | Low | Applicants do not get an email with the decision | No email provider is connected | Use the NotificationOutbox when email delivery is approved |
| N11 | Info | Testing-agent pytest files were added under `/tests` (`test_tb_em_002_applications_api.py`, `tb_em_002_seed_apps.py`) | Root `tests/` folder | Keep them as external smoke tests, or move them under `apps/api/test/` |
| N12 | Low | Invitation delivery is outbox-only; there is no real email provider | `apps/api/.outbox/` in preview | Connect an approved email provider behind `DevMailboxService.send` |
| N13 | Low | The mobile primary nav scrolls sideways once a role has 5+ items, without an edge cue | `/app/*` at 390px as center administrator | Reuse `ScrollStrip` (same as N9) |
| N14 | Low | Suspending or revoking a member signs out every session whose active workspace is that center, including the same user's other open tabs | `POST …/staff/:id/suspend` | Acceptable (fail-safe). Later: notify the user on next sign-in |
| N15 | Low | Platform cannot suspend or reactivate a whole center yet (`center.status` exists, no route) | — | Add `platform.centers.suspend` with audit when needed |
| N16 | Info | Center names are unique platform-wide (case-insensitive) as duplicate prevention | `POST /api/platform/centers` returns 409 | Relax to per-country uniqueness if real centers share names |

