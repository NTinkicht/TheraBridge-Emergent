# M4-C01 — Security closure (synthetic only)

**Workstreams:** #178 (clinical authorization / tenant + specialty isolation), #179 (HTTP / session security). Related ongoing transactional reset PR #286 is independent and must merge safely; this PR does not duplicate its work.

**This tranche:** tighten authenticated role-denial QA so a lost session (401) cannot masquerade as successful authorization isolation. Include negative-path regression tests and safeguard the existing clinical NO-GO gates.

**Not yet proven by this tranche:** complete clinical cross-tenant and guardian-revocation matrix, signed policies, HTTP security certification, or protected hosted run. Keep both workstream issues open until evidence is complete.

**Acceptance:** CI tests prove 401 is not accepted for authenticated denied routes; 403/404 are accepted only after a known valid session, and 200/3xx/5xx fail. Six exact-head jobs plus independent review required before merge. No real child data, changes to clinical authorization decisions, signing, consent, release, real STT/AI, or deployment.
