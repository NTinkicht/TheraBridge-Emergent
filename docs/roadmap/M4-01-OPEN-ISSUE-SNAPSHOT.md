# M4-01 — Historical open-issue reconciliation snapshot

**As-of:** 2026-11-07. **Search scope:** open issues created before 2026-11-07 (excludes all new M4–M11 roadmap issues). **Retrieved:** 75 distinct historical issues.

> **Important:** This is a factual historical issue inventory, **not** evidence that an underlying defect still exists. M1–M3 remain owner-closed; source+tests+policy must be checked before marking any item done. The original 2026-10-22 workbook contained a separate historical 64-open-issue snapshot, not a statement about today's issue count.

## Reconciliation procedure
1. Read the issue and its associated PRs, latest merged main code, test evidence, and signed owner policy if applicable.
2. Assign one of **VERIFIED_IMPLEMENTED**, **PARTIAL**, **MISSING**, **POLICY_BLOCKED**, **SUPERSEDED**, **DUPLICATE**, with justification and a current work-unit ID.
3. Close only when cited exact-head evidence fully addresses acceptance. Preserve historic issue links; do not delete or silently reuse old status.
4. Cross-check the [66-feature crosswalk](M4-01-66-FEATURE-CROSSWALK.csv), 91-workflow sheet, 55-owner-requirement sheet, and V1/V2 exclusion rule.

## Historical open issue inventory (75)

| Issue | Historic title | Evidence disposition |
|---:|---|---|
| [#3](https://github.com/NTinkicht/TheraBridge-Emergent/issues/3) | Follow-up (non-blocking): reconcile checkpoint handover and historical test documentation | **PENDING_REVIEW** — classify against merged HEAD |
| [#4](https://github.com/NTinkicht/TheraBridge-Emergent/issues/4) | Follow-up (non-blocking): strengthen gitleaks multi-branch coverage and allowlist review | **PENDING_REVIEW** — classify against merged HEAD |
| [#5](https://github.com/NTinkicht/TheraBridge-Emergent/issues/5) | N1 — Emergent preview proxy rewrites SameSite cookie attribute | **PENDING_REVIEW** — classify against merged HEAD |
| [#6](https://github.com/NTinkicht/TheraBridge-Emergent/issues/6) | N2 — Preview IP forwarding collapses visitors into one edge rate-limit bucket | **PENDING_REVIEW** — classify against merged HEAD |
| [#7](https://github.com/NTinkicht/TheraBridge-Emergent/issues/7) | N3 — Expand compromised/common-password protection | **PENDING_REVIEW** — classify against merged HEAD |
| [#8](https://github.com/NTinkicht/TheraBridge-Emergent/issues/8) | N4 — Account lockout can be abused for targeted temporary denial of service | **PENDING_REVIEW** — classify against merged HEAD |
| [#9](https://github.com/NTinkicht/TheraBridge-Emergent/issues/9) | N5 — Rate-limit windows use minute buckets rather than exact sliding windows | **PENDING_REVIEW** — classify against merged HEAD |
| [#10](https://github.com/NTinkicht/TheraBridge-Emergent/issues/10) | N6 — Audit event append-only rule lacks database enforcement | **PENDING_REVIEW** — classify against merged HEAD |
| [#11](https://github.com/NTinkicht/TheraBridge-Emergent/issues/11) | N7 — Classify and relocate preview-only pytest smoke test | **PENDING_REVIEW** — classify against merged HEAD |
| [#13](https://github.com/NTinkicht/TheraBridge-Emergent/issues/13) | N8 — Count unsuccessful application submissions against public rate limit | **PENDING_REVIEW** — classify against merged HEAD |
| [#14](https://github.com/NTinkicht/TheraBridge-Emergent/issues/14) | N9 — Mobile application status tabs lack horizontal-scroll hint | **PENDING_REVIEW** — classify against merged HEAD |
| [#15](https://github.com/NTinkicht/TheraBridge-Emergent/issues/15) | N10 — Notify applicants of application review outcome | **PENDING_REVIEW** — classify against merged HEAD |
| [#16](https://github.com/NTinkicht/TheraBridge-Emergent/issues/16) | N11 — Rehome testing-agent Python files outside app root | **PENDING_REVIEW** — classify against merged HEAD |
| [#17](https://github.com/NTinkicht/TheraBridge-Emergent/issues/17) | TB-EM-002 — Review public duplicate-email responses for application enumeration | **PENDING_REVIEW** — classify against merged HEAD |
| [#18](https://github.com/NTinkicht/TheraBridge-Emergent/issues/18) | TB-EM-003 (combined with TB-EM-004): Complete center provisioning and staff onboarding | **PENDING_REVIEW** — classify against merged HEAD |
| [#19](https://github.com/NTinkicht/TheraBridge-Emergent/issues/19) | N12 — Integrate approved invitation email delivery | **PENDING_REVIEW** — classify against merged HEAD |
| [#20](https://github.com/NTinkicht/TheraBridge-Emergent/issues/20) | N13 — Add mobile navigation overflow affordance for center staff roles | **PENDING_REVIEW** — classify against merged HEAD |
| [#21](https://github.com/NTinkicht/TheraBridge-Emergent/issues/21) | N14 — Improve UX after staff access suspension revokes active sessions | **PENDING_REVIEW** — classify against merged HEAD |
| [#22](https://github.com/NTinkicht/TheraBridge-Emergent/issues/22) | N15 — Implement platform-wide center suspension and reactivation | **PENDING_REVIEW** — classify against merged HEAD |
| [#23](https://github.com/NTinkicht/TheraBridge-Emergent/issues/23) | N16 — Revisit center-name uniqueness across countries | **PENDING_REVIEW** — classify against merged HEAD |
| [#24](https://github.com/NTinkicht/TheraBridge-Emergent/issues/24) | TB-EM-005 — Complete approved trial limits and expiry before child onboarding | **PENDING_REVIEW** — classify against merged HEAD |
| [#25](https://github.com/NTinkicht/TheraBridge-Emergent/issues/25) | N17 — Filter booking therapist choices to child's service assignments | **PENDING_REVIEW** — classify against merged HEAD |
| [#26](https://github.com/NTinkicht/TheraBridge-Emergent/issues/26) | N18 — Add repeating appointments and accessible calendar grid | **PENDING_REVIEW** — classify against merged HEAD |
| [#27](https://github.com/NTinkicht/TheraBridge-Emergent/issues/27) | N19 — Define non-trial center entitlement state without inventing billing | **PENDING_REVIEW** — classify against merged HEAD |
| [#28](https://github.com/NTinkicht/TheraBridge-Emergent/issues/28) | TB-EM-005 — Trial expiry does not gate all center-administration mutations | **PENDING_REVIEW** — classify against merged HEAD |
| [#29](https://github.com/NTinkicht/TheraBridge-Emergent/issues/29) | Roadmap — Resolve TB-EM-006 numbering collision with V1 final QA/handover | **PENDING_REVIEW** — classify against merged HEAD |
| [#30](https://github.com/NTinkicht/TheraBridge-Emergent/issues/30) | N20 — Split recurring series on 'this and following' updates | **PENDING_REVIEW** — classify against merged HEAD |
| [#31](https://github.com/NTinkicht/TheraBridge-Emergent/issues/31) | N21 — Add message inbox unread badge and update notifications | **PENDING_REVIEW** — classify against merged HEAD |
| [#32](https://github.com/NTinkicht/TheraBridge-Emergent/issues/32) | N22 — Decide custody/privacy and per-guardian message visibility | **PENDING_REVIEW** — classify against merged HEAD |
| [#33](https://github.com/NTinkicht/TheraBridge-Emergent/issues/33) | N23 — Make schedule-change notification horizon policy-controlled | **PENDING_REVIEW** — classify against merged HEAD |
| [#34](https://github.com/NTinkicht/TheraBridge-Emergent/issues/34) | N24 — Optional drag-to-reschedule calendar interactions | **PENDING_REVIEW** — classify against merged HEAD |
| [#35](https://github.com/NTinkicht/TheraBridge-Emergent/issues/35) | P0 release gate — Family free-text messaging violates unsigned safeguarding D-NEW-5 | **PENDING_REVIEW** — classify against merged HEAD |
| [#36](https://github.com/NTinkicht/TheraBridge-Emergent/issues/36) | N25 — Never silently supersede a therapy plan under supervisor review | **PENDING_REVIEW** — classify against merged HEAD |
| [#37](https://github.com/NTinkicht/TheraBridge-Emergent/issues/37) | N26 — Add read-only clinical plan version history and comparison UI | **PENDING_REVIEW** — classify against merged HEAD |
| [#38](https://github.com/NTinkicht/TheraBridge-Emergent/issues/38) | N27 — Replace raw nested goal/activity validation errors with usable field messages | **PENDING_REVIEW** — classify against merged HEAD |
| [#39](https://github.com/NTinkicht/TheraBridge-Emergent/issues/39) | TB-EM-008 clinical integrity — validate observation's linked session-note child, center and owner | **PENDING_REVIEW** — classify against merged HEAD |
| [#40](https://github.com/NTinkicht/TheraBridge-Emergent/issues/40) | TB-EM-008 — Enforce plan-draft author or explicit team collaboration permission | **PENDING_REVIEW** — classify against merged HEAD |
| [#41](https://github.com/NTinkicht/TheraBridge-Emergent/issues/41) | N28 — Coalesce clinical report autosave activity events without losing audit integrity | **PENDING_REVIEW** — classify against merged HEAD |
| [#42](https://github.com/NTinkicht/TheraBridge-Emergent/issues/42) | N29 — Link supervisor progress dashboards directly to report review queues | **PENDING_REVIEW** — classify against merged HEAD |
| [#43](https://github.com/NTinkicht/TheraBridge-Emergent/issues/43) | TB-EM-009 — Preserve goal identity across plan versions in progress/report evidence | **PENDING_REVIEW** — classify against merged HEAD |
| [#44](https://github.com/NTinkicht/TheraBridge-Emergent/issues/44) | TB-EM-009 — Future family-safe report preview must be tied to immutable evidence snapshot | **PENDING_REVIEW** — classify against merged HEAD |
| [#45](https://github.com/NTinkicht/TheraBridge-Emergent/issues/45) | N30 — Keep active family Practice navigation tab visible on narrow phones | **PENDING_REVIEW** — classify against merged HEAD |
| [#46](https://github.com/NTinkicht/TheraBridge-Emergent/issues/46) | N31 — Improve native date inputs in therapist Practice feedback filters | **PENDING_REVIEW** — classify against merged HEAD |
| [#47](https://github.com/NTinkicht/TheraBridge-Emergent/issues/47) | TB-EM-010 — Enforce guardian revocation before idempotency replay and outcome creation | **PENDING_REVIEW** — classify against merged HEAD |
| [#51](https://github.com/NTinkicht/TheraBridge-Emergent/issues/51) | Security: therapist clinical workspace may expose other specialties' records | **PENDING_REVIEW** — classify against merged HEAD |
| [#58](https://github.com/NTinkicht/TheraBridge-Emergent/issues/58) | TB-EM-015 · Therapist session execution + speech-to-text foundation (FreeBuff) | **PENDING_REVIEW** — classify against merged HEAD |
| [#60](https://github.com/NTinkicht/TheraBridge-Emergent/issues/60) | TB-EM-016 · Genuine therapist speech-to-text engine (policy-gated V1) | **PENDING_REVIEW** — classify against merged HEAD |
| [#64](https://github.com/NTinkicht/TheraBridge-Emergent/issues/64) | TB-EM-019 — Child 360°, advanced progress, and clinician-controlled report/home-plan assistance | **PENDING_REVIEW** — classify against merged HEAD |
| [#67](https://github.com/NTinkicht/TheraBridge-Emergent/issues/67) | TB-EM-021 — Persistent clinician evidence decisions and source-to-sentence traceability (synthetic-only) | **PENDING_REVIEW** — classify against merged HEAD |
| [#68](https://github.com/NTinkicht/TheraBridge-Emergent/issues/68) | TB-EM-022 — Explicit child-wide care referent lifecycle without clinical privileges | **PENDING_REVIEW** — classify against merged HEAD |
| [#77](https://github.com/NTinkicht/TheraBridge-Emergent/issues/77) | TB-EM-026 follow-up — Expand review-queue browser and status exclusion regressions | **PENDING_REVIEW** — classify against merged HEAD |
| [#80](https://github.com/NTinkicht/TheraBridge-Emergent/issues/80) | Clinical decision required — pending report reviews when a child is archived | **PENDING_REVIEW** — classify against merged HEAD |
| [#81](https://github.com/NTinkicht/TheraBridge-Emergent/issues/81) | TB-EM-025 — Unblock external responsive and cookie acceptance runner | **PENDING_REVIEW** — classify against merged HEAD |
| [#83](https://github.com/NTinkicht/TheraBridge-Emergent/issues/83) | TB-EM-028 follow-up — Hosted QA supply-chain, provenance and preflight hardening (P3) | **PENDING_REVIEW** — classify against merged HEAD |
| [#85](https://github.com/NTinkicht/TheraBridge-Emergent/issues/85) | TB-EM-028 QA follow-up — investigate hosted synthetic session cleanup warnings | **PENDING_REVIEW** — classify against merged HEAD |
| [#106](https://github.com/NTinkicht/TheraBridge-Emergent/issues/106) | TB-EM-046 — Milestone 1 closeout: full clinician journey acceptance and remaining duration gap | **PENDING_REVIEW** — classify against merged HEAD |
| [#112](https://github.com/NTinkicht/TheraBridge-Emergent/issues/112) | P3 follow-up: child-scoped cancelled handover history and pagination | **PENDING_REVIEW** — classify against merged HEAD |
| [#114](https://github.com/NTinkicht/TheraBridge-Emergent/issues/114) | P3 QA: cross-session handover readiness status synchronization in Playwright | **PENDING_REVIEW** — classify against merged HEAD |
| [#115](https://github.com/NTinkicht/TheraBridge-Emergent/issues/115) | TB-EM-051 policy gate — obtain signed decisions before executable therapist replacement | **PENDING_REVIEW** — classify against merged HEAD |
| [#117](https://github.com/NTinkicht/TheraBridge-Emergent/issues/117) | [GH-01] [Wave 1] security(clinical): enforce therapist specialty verification across all clinical, report, governance & practice paths | **PENDING_REVIEW** — classify against merged HEAD |
| [#118](https://github.com/NTinkicht/TheraBridge-Emergent/issues/118) | [GH-02] [Wave 1] security(tenancy): enforce explicit centerId and state predicates across all 6 CAS updateMany mutations | **PENDING_REVIEW** — classify against merged HEAD |
| [#119](https://github.com/NTinkicht/TheraBridge-Emergent/issues/119) | [GH-03] [Wave 2] perf(api): eliminate N+1 query loops inside center-locked transactions and downgrade lockCenter to FOR NO KEY UPDATE | **PENDING_REVIEW** — classify against merged HEAD |
| [#120](https://github.com/NTinkicht/TheraBridge-Emergent/issues/120) | [GH-04] [Wave 2] db(prisma): add missing foreign keys on 8 clinical/draft tables, 5 hot-query indexes, transfer version CAS & audit_event trigger | **PENDING_REVIEW** — classify against merged HEAD |
| [#121](https://github.com/NTinkicht/TheraBridge-Emergent/issues/121) | [GH-05] [Wave 3] fix(operations): cascade therapist revocation/suspension, service removal & assignment termination across series, notices & referent | **PENDING_REVIEW** — classify against merged HEAD |
| [#124](https://github.com/NTinkicht/TheraBridge-Emergent/issues/124) | [GH-08] [Wave 1] security(http): enforce Cache-Control: no-store globally, rate-limit password change, eliminate GET mutations & add PrismaExceptionFilter | **PENDING_REVIEW** — classify against merged HEAD |
| [#126](https://github.com/NTinkicht/TheraBridge-Emergent/issues/126) | [GH-10] [Wave 2] perf(api): bound 11 unbounded findMany queries, optimize reminder sweep P2002 storm & prune expired rate_limit_counter rows | **PENDING_REVIEW** — classify against merged HEAD |
| [#127](https://github.com/NTinkicht/TheraBridge-Emergent/issues/127) | [GH-11] [Wave 4] fix(web): fix SessionEditor missing useEffect dependency array, browser-local timezone corruption & stale cross-center centerTz/csrf | **PENDING_REVIEW** — classify against merged HEAD |
| [#128](https://github.com/NTinkicht/TheraBridge-Emergent/issues/128) | [GH-12] [Wave 4] fix(web): prevent ReportToPlanHandoff UI lockout on partial goal errors and propagate ApiError / 401 handler in handover & practice | **PENDING_REVIEW** — classify against merged HEAD |
| [#129](https://github.com/NTinkicht/TheraBridge-Emergent/issues/129) | [GH-13] [Wave 4] arch(web): introduce shared /app/layout.tsx SessionProvider, eliminate schedule double-fetch & gate disabled messages API calls | **PENDING_REVIEW** — classify against merged HEAD |
| [#130](https://github.com/NTinkicht/TheraBridge-Emergent/issues/130) | [GH-14] [Wave 4] feat(web): add App Router error.tsx / not-found.tsx boundaries, guard /dev/feasibility in production & set Next.js security headers | **PENDING_REVIEW** — classify against merged HEAD |
| [#131](https://github.com/NTinkicht/TheraBridge-Emergent/issues/131) | [GH-15] [Wave 4] a11y(web): fix duplicate DOM IDs in SelectField/ReasonField, enforce 44x44px touch targets & implement WAI-ARIA tablist keyboard nav | **PENDING_REVIEW** — classify against merged HEAD |
| [#132](https://github.com/NTinkicht/TheraBridge-Emergent/issues/132) | [GH-16] [Wave 4] perf(web): memoize O(N*M*366) PlanEditor schedule projections and CalendarGrid lane layout | **PENDING_REVIEW** — classify against merged HEAD |
| [#134](https://github.com/NTinkicht/TheraBridge-Emergent/issues/134) | [GH-18] [Wave 0] ci(migrations): fix out-of-order 049 migration timestamp, repair additive migration CI check & wrap seed scripts in DB transactions | **PENDING_REVIEW** — classify against merged HEAD |
| [#135](https://github.com/NTinkicht/TheraBridge-Emergent/issues/135) | [GH-19] [Wave 5] ops(docker): harden Dockerfiles to run as non-root user, bound Node heap for Render 512MB RAM & add CI concurrency/timeouts | **PENDING_REVIEW** — classify against merged HEAD |
| [#136](https://github.com/NTinkicht/TheraBridge-Emergent/issues/136) | [GH-20] [Wave 5] test(quality): add unit test runner to @therabridge/web, enforce >=95% coverage gates across API & Web, centralize env config & align docs | **PENDING_REVIEW** — classify against merged HEAD |

## High-risk buckets
- **Clinical authorization:** GH-01, cross-specialty access, guardian revocation, report/plan draft ownership. M4-04, M6-12.
- **HTTP, auth and tenancy:** GH-02/GH-08, N1–N5, public enumeration. M4-04/05.
- **Database/performance/CI:** GH-03/GH-04/GH-10/GH-18/GH-19/GH-20, N6. M4-06/07/08.
- **UI/accessibility:** GH-11…GH-16, N9/N13/N14/N27/N30/N31. M5.
- **Operations and family:** TB-EM-051/052/053, recurring schedule, messaging, releases. M6/M7/M9.
- **AI/STT:** evidence and synthetic AI foundations from M3 remain closed; policy-controlled real integration is M8.
- **QA:** hosted cookie/session cleanup, external responsive acceptance, test provenance and preflight. M4-02/M11.

## Traceability constraints
Keep signed policy decisions separate from source completeness. Real clinical activation, signing, audio/STT, releases, safeguarding and real family messaging remain NO-GO until formal approvals.
