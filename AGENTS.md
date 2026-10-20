# Agent operating instructions — TheraBridge-Emergent

Applies to Emergent and any future ChatGPT, Codex, Claude or human engineering contributor.

1. **Truth hierarchy:** signed owner decisions in private `NTinkicht/TheraBridge` → owner-provided TheraBridge Emergent blueprint → current implementation. Mark unresolved/unsigned policies as OPEN; do not invent decisions.
2. **Synthetic only:** never use real children, guardian accounts, therapy notes, clinical images, recordings, health records, or live patient data in Emergent.
3. **Portable first:** never let app logic depend on Emergent chat memory. Commit source, tests, schema/migrations, deterministic synthetic seed, dependency locks, runbooks, architecture and permission mappings.
4. **One work unit at a time:** plan → implement → run tests → update evidence files → export GitHub checkpoint → verify SHA → independent reviewer → next task.
5. **Denial by default:** clinical approvals/signatures, guarded releases, consent, safeguarding, sensitive media and recording stay disabled until named owner review and sign-off. Admin rights do not confer clinical access.
6. **Scope checks on the server:** tenant, child, actor relationship, active assignment, role/specialty, consent and version when relevant. Never rely on sidebar hiding.
7. **Keep current:** `docs/handover/CURRENT_STATE.md`, `docs/handover/WORK_LOG.md`, `docs/handover/NEXT_WORK.md`, `docs/qa/TEST_RESULTS.md`; mark PASS/FAIL/NOT RUN accurately.
8. **API and data transparency:** document dependencies, schema, endpoint contracts, rate limits, jobs, externally owned services, environment variable **names only**, and exit strategy.
9. **Prefer the approved stack:** Next.js, React, TS, NestJS/Fastify, PostgreSQL/Prisma, Redis/BullMQ, OIDC, private object store. If Emergent cannot support it, request explicit approval for a clearly segregated prototype; never silently swap architecture.
10. **No secrets in git.** Never force-push or overwrite `main`, never automatically merge, never publish a clinical or production application.
11. **Design:** TheraBridge naming, Direction B brand system, IBM Plex Sans, exact tokens supplied by owner, responsive 320/390/768/1024/1440. Implement a replaceable logo component, no fabricated official emblem.
12. **Takeover test:** prove clean clone → install → seed → start → test → change code on new branch → PR without Emergent; do not claim verified without execution evidence.

Current repository started as **documentation only**. See `README.md` and handover state before assuming an application exists.
