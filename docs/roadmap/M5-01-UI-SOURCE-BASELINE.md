# M5-01 — UI/UX source audit baseline, not completed visual acceptance

**Scope:** initial reproducible route/source and navigation inventory for issue #184. **Status:** implementation in PR; CI and reviewer approval not yet established. Do not close M5-01 on this evidence alone.

## Evidence observed from source (2026-11-15)

- `apps/web/src/components/auth/ProductShell.tsx` has a permission-filtered NAV, desktop sidebar, mobile `select` navigation, a family theme branch, and a multi-context switcher. There are two `/app/activities` entries gated by different permissions. This is a **code fact**, not proof of mobile usability or a bug.
- `apps/web/src/lib/auth.ts` defines six role constants. The seven requested demo personas split `THERAPIST` into Speech and OT, so the capture plan uses seven personas, not seven authorization roles.
- `apps/web/src/app/app/clinical/[id]/page.tsx` defines six clinical workspace tabs; its code imports child overview, plan, assessment, sessions, progress and report panels. The page has source-level complexity but its *actual rendered length and user difficulty remain unmeasured*.
- Direction B's clinical/family visual language and existing role permission/clinical restrictions must be retained. This PR does not change a visual component or activate any clinical flow.

## Deliverable

`scripts/qa/m5-route-audit.mjs` creates a deterministic JSON receipt from the **checked-out repository**: canonical page paths, source hashes and line counts, direct per-page code hints, ProductShell navigation entries, exceptional Next.js routes and source-complexity triage, and 175 specifically labeled pending capture targets (seven personas × five viewports × five route-entry tasks). It rejects duplicate canonical routes, missing navigation pages, or missing task routes. A companion Node test suite covers invalid inputs and negative cases. CI stores the receipt as a per-commit artifact; it must never be interpreted as screenshots, role permissions, task completion or accessibility clearance.

## Mandatory next phase — NOT RUN

1. On an **isolated synthetic-only** fixture, capture and visually inspect 320/390/768/1024/1440 screenshots for the seven personas; include login, navigation, page, loading, empty, denied and error states. Keep screenshots private/sanitized and exclude credentials, cookies, clinical records and real family data.
2. Actually execute and time the five most important **full tasks** per persona (not merely route entry); record steps/clicks, duration, friction, errors and barriers. In a protected setting, verify permission-specific routes, specialty/guardian boundaries, sign-out and context changes.
3. Record screenshots with annotated source/run SHA, audit time, role, viewport, task step and result. Independently check focus order, keyboard, screen reader, 200% zoom, low bandwidth, touch targets and family dark theme.
4. Verify role-specific before/after changes in separate PRs, test source and browser regressions, obtain independent Codex review and all exact-head CI; **do not imply M5-01 exit acceptance before owner review**.

## Interpretation rules

- `SOURCE_INDEXED_ONLY` and `NOT_RUN` are not PASS.
- Counts of `<button>` and `<h1>` in route source omit imported components, conditional UIs and client-side states. Source-size hotspots are **triage candidates**, not UX defect findings.
- No changes to deployed Render services, the protected ten-account harness, shared databases, commercial licensing, patient features or G2/G2b clinical NO-GO.
- M4-02 #176/#268 and M4-09 #183 remain independent outstanding acceptance dependencies.
