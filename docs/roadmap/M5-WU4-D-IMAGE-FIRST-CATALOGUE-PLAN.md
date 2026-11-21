# M5 WU4-D — Image-first activity catalogue (planning checkpoint)

**Status:** PLANNED — NOT IMPLEMENTED — NOT TESTED.  
**Roadmap:** M5-12 (#195); dependencies M5-13 (#196), M5-14 (#197), M5-15 (#198), M5-16 (#199), M5-17 (#200).  
**Predecessor:** #436 merged into main at `eb7c4dd3ececa214187e9d20ec600e7af6fcde32`. WU4-A/B/C (#433–#435) also merged.

## Intent
Deliver accessible image-first searchable grid/list activity browsing for authorized staff, using the existing library and proposed media registry; keep all unapproved media private and invisible in published/guardian experiences. Neither images nor rights are presently approved. Do not fabricate placeholder approvals or rely on client filtering for authorization.

## Ordered implementation
1. Inspect existing activity list/detail server contracts, roles, tenant and specialty scope, pagination, approved/published activity state, current proposal/rights model and feature flags. Reuse existing APIs where possible; record any missing invariant before schema changes.
2. Design a single server-authoritative **approved image** projection. Only a human-reviewed, immutable, properly rights-cleared asset may be returned as displayable. The proposed/draft/rejected/expired/missing state must never expose private URLs or bytes. If no approved serving pipeline exists, use accessible neutral text/shape placeholders; do not synthesize approvals.
3. Build task-focused responsive grid/list and optional details with 4:3 media slots, square-safe presentation, explicit text specialty labels and permission-safe metadata. Search/filter by supported specialty, category, skill, equipment; preserve keyboard and screen-reader access, deep links, focus restoration, pagination, and existing edit/duplicate authorization.
4. Separate staff-only proposal UI from published surfaces. Never show an unapproved or mismatched tenant/child/center asset to a guardian, another tenant or non-owner. Do not turn on live media upload/AI generation/guardian release.
5. Test empty/search/no-results, loading, pagination, 403/404, revoked roles, cross-tenant/specialty access, unsafe/expired/missing assets, failed image loads, missing alt text, blocked publication, and duplicate/version behavior. Exercise 320, 390, 768, 1024, 1440 widths, dark family theme where applicable, keyboard, RTL, low bandwidth and real assistive-tech review.

## Acceptance gates
- Unit, contract, API integration, Jest and Playwright/browser tests using synthetic *_demo_test data only.
- Exact-HEAD push + pull_request CI: original six required jobs plus SBOM, provenance/security, browser, source-contracts and Smart CI gate; do not delete/skip an existing required check or lower thresholds.
- Initial @codex review at PR opening; collect every reviewer comment, disposition FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON, regression tests for P0–P2 and a final fresh exact-HEAD review.
- Before/after redacted five-width screenshots, screen-reader and task-performance evidence. Track NOT RUN and BLOCKED accurately; do not claim human WCAG, usability, clinical, image-rights or production approval.
- Explicit review of #195 definition of done and #198/#200 prerequisites. **M5-12 cannot close** until every published active activity has an approved, legitimately sourced image and objective acceptance evidence.

## Non-negotiable restrictions
G2/G2b clinical signing, consent, release, sensitive media, real recordings, real patient data and production use remain **NO-GO**. No approval can be inferred from CI, owner account role or a draft metadata record. Follow AGENTS.md Rule 16 before merging; this planning-only draft is never merge-ready.
