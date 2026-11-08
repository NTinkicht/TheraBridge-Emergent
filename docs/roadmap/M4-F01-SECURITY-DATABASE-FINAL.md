# M4-F01 — Security and database final qualification
**Parent work units:** #179, #180; follow-up #280. **New change:** real PostgreSQL audit mutation concurrency / permission regression in `apps/api/test/m4-db-integrity.e2e-spec.ts`.
## Verified merged implementation to reuse
- #271, #285 and #287: supervisor/clinical authorization and authenticated negative QA; clinical M4-04 #178 is closed.
- #272, #284, #286: account recovery, token/session/lockout atomicity and early-boundary fault injection; #280's acceptance evidence should be reconciled rather than rewriting reset.
- #273 and #281: audit UPDATE/DELETE/TRUNCATE database triggers, clinical plan foreign keys and scoped indexes; follow-up #277 already closed.
## New regression
- Inspect actual PostgreSQL catalog: both audit triggers enabled and no PUBLIC TRUNCATE grant.
- Simultaneously attempt ORM UPDATE and DELETE of a synthetic audit event, require both rejected and the exact row retained; separately require an ordinary audit INSERT still succeeds.
## Remaining evidence not falsely certified here
- The CI PostgreSQL test identity may be the table owner; this does not prove a least-privileged Render runtime role. Operator must inspect actual deployment role and separate DDL credentials.
- Neon pooled migrations, CAS contention and connection limits require independently measured repeat-run evidence, not a handover assertion.
- Broader session/proxy/SameSite/CSRF matrix must be traced to existing tests; only genuinely uncovered cases require new tests.
- No signing, safeguarding, consent activation, family release, real audio/STT/AI, production changes or patient data. G2/G2b NO-GO.
## Qualification
Six exact-head CI jobs, exact-head independent review, disposition all P0-P3 comments, and explicit issue closure evidence. New regression is NOT VERIFIED until its CI completes. Parent #179/#180 remain open until criteria are reconciled.