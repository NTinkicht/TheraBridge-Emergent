# M4 closeout checkpoint — 2026-11-08

**Milestone #167 OPEN, synthetic-only.** Nine work units, of which #177 (M4-03 credential/seed integrity) was closed with PR #270, six-job CI run 42400227318 and exact-head reviews. This is a scoped closeout; hosted 10-role acceptance remains open in #176/#268.

## Parent work units still open
- **M4-01 #175:** 66/91/55 rows and 1,023 individual steps not reconciled to tested implementation. Private controlled source now READABLE but UNSIGNED (see `M4-01-CONTROLLED-SOURCE-ACCESS.md` and #266).
- **M4-02 #176:** protected hosted ten-account acceptance, two-tenant/read and live revocation evidence (#268/#269) NOT RUN.
- **M4-04 #178:** clinical/guardian/tenant full negative matrices, CAS concurrency and browser acceptance remain.
- **M4-05 #179:** proxy, cookie, CSRF, application enumeration, distributed abuse, account recovery/MFA and security UX acceptance; #280.
- **M4-06 #180:** PR #281 implements SQL audit TRUNCATE guard; still verify runtime/migration DB-role boundaries (#277), replay, migration rollback and load.
- **M4-07 #181:** load/query latency, worker/idempotency and resource measurements remain.
- **M4-08 #182:** measured application-wide API/web coverage target, verified suite baseline (#278), supply chain, repeatability, process branch-history audit (#279).
- **M4-09 #183:** historical issue evidence register now selectively triaged: #8 VERIFIED_IMPLEMENTED, #10/#21 PARTIAL, #35 POLICY_BLOCKED, others PENDING_EVIDENCE. Do not close the 75-issue register prematurely.

## Release and closure policy
Keep G2/G2b, consent, clinical signing, family release, safeguarding D-NEW-5, real STT/AI and real patient use **NO-GO**. Confirm all P0/P1 vulnerabilities fixed or separately documented as blocking, complete six-job exact-head CI and independent reviews, and obtain owner closure approval before closing M4 epic.
