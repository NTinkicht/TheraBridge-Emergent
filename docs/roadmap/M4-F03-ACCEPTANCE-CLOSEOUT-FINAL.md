# M4-F03 — Controlled acceptance, traceability and historic closeout
**Parent work units:** #175, #176, #183; follow-ups #266, #268, #279. This PR does **not** declare milestone acceptance.
## Existing evidence
- #265 inventories 66 features, 91 workflow IDs, 55 owner requirements; WF-X6 remains V2 excluded. The owner workbook's 1,023 step IDs were counted, but row-by-row live code/UI/test mapping remains incomplete.
- #267/#289 create a read-only private 7+3 user test harness; deployed SHA and protected test run are **NOT RUN** in current M4-02 evidence.
- #276/#282/#290 freeze 75 historic issues and protect against unsupported verified/closed claims. Most still require actual issue-by-issue disposition.
## New fail-closed independent acceptance gate
`scripts/qa/m4-acceptance-evidence.mjs` and unit regressions require two sanitized report schemas, all seven original + three therapist identities, meaningful positive and denial checks, correct summary counts, no FAIL/BLOCKED cases, operator authorization, matching 40-character deployed/verified SHA, and **separate sanitized receipt tied to that SHA** proving two valid tenants, both authorized positive controls, prohibited cross-tenant access, and live revocation denial.
A single nonexistent-center 404, skipped login, simple boolean approval, old SHA or CI-only smoke test cannot qualify. The validator never prints records or credentials and always reports clinicalActivationAuthorized:false.
## Still required, not fabricated
- Human-approved protected runner on operator-verified Render SHA, receipt for two independent existing tenants and accelerated revocation, and QA report link. No production mutation permitted.
- Exact controlled 1,023-step / 66 / 91 / 55 row links against merged code and tests; source signatures only if they exist. Record gaps as BLOCKED, not PASS.
- For 75 historic issues, inspect original issue and merged commit/test; choose evidence-backed disposition, close only eligible issues; do not blindly bulk-close or waive P0/P1.
- Audit process issue #279; preserve non-force merge ancestry. M4 epic #167 remains OPEN until documented acceptance and owner signoff.
## Review
New regression runs in the required six-job CI `test` job through the historical evidence test suite; independent final-HEAD reviewer required. Clinical NO-GO preserved.