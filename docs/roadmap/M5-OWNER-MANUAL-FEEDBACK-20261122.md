# M5 owner manual-feedback register — 22 November 2026

**Source:** Owner-led synthetic Render role walkthrough (21–22 Nov 2026). **Evidence:** screenshots in ChatGPT conversation; do not copy clinical data, browser session tokens or user credentials into git. **Status:** Observations recorded, not independently resolved. No production or clinical approval is implied.

## Deduplication and acceptance

32 **unique** observations. Identical Schedule / Children / Library defects seen by Center Administrator, Coordinator, Speech Therapist and Supervisor are tracked **once** and must be verified in each authorized role. **Observation 32 is app-wide, not guardian-specific:** inspect shared header, sidebar, mobile navigation and nested content in every role and route where a dark theme can be selected. Preserve intended staff theme behavior; do not report a family-only fix as global acceptance. Other therapy specialties were reported to share the Speech Therapist comments but were not separately accepted. Protected clinical actions, real media and family document release remain gated.

Every item needs a code/test link, five-width before/after redacted visual evidence, keyboard/accessibility review, exact-head CI + >=90% eight-metric API/Web standards, independent review and explicit owner's acceptance before marking **DONE**. No `PASS` is inferred from opening or merging a PR.

## Frozen implementation packages (owner authorization: “go ahead”)

| ID | Feedback (single underlying defect) | Package | Scope / dependency | Current status |
|---|---|---|---|---|
| 01 | Schedule filter alignment/typography | PR1 | Shared Schedule UI | IN_PR_461, NOT QUALIFIED |
| 02 | Weekly calendar vertical grid/header alignment | PR1 | Shared Calendar scrollport | IN_PR_461, NOT QUALIFIED |
| 03 | Schedule therapist search typeahead | PR1 | Scoped therapist directory | IN_PR_461, NOT QUALIFIED |
| 04 | Custom appointment recurrence | PR2 | M7 recurring scheduling / server validation | REPORTED |
| 05 | Children search typeahead | PR1 | Center- and role-scoped directory | IN_PR_461, NOT QUALIFIED |
| 06 | Children rows shift when “No guardian” is present | PR1 | Fixed third status column | IN_PR_461, NOT QUALIFIED |
| 07 | Activity catalogue card heights and action alignment | PR1 | Shared staff grid | IN_PR_461, NOT QUALIFIED |
| 08 | Image placeholders unsuitable for Grid vs List | PR1 | 4:3 image-first grid + compact list | IN_PR_461, NOT QUALIFIED |
| 09 | Missing centre phone and contact email | PR2 | Contact schema, forms and validation | REPORTED |
| 10 | User job title editing / role distinction | PR2 | Profile fields vs admin-set permissions | REPORTED |
| 11 | Child registration lacks condition/allergy/medication/care information | PR2 | Progressive intake; M6/M9 review and confidential access, no unapproved clinical activation | REPORTED |
| 12 | Specialty colour identity and gradient for multi-specialty activities | PR1 | Approved Direction B tokens; existing API stores ONE service, multi-service persistence requires separate approved spec | IN_PR_461, NOT QUALIFIED |
| 13 | Optional child profile photo | PR2 | Privacy, guardian consent, signed media controls | REPORTED |
| 14 | Child-row quick actions incl. Guardian only if registered/authorized | PR2 | Role/scoped shortcuts, messaging gate | REPORTED |
| 15 | Progress charts need goal/plan links and versioned target changes | PR3 | Immutable history / M6 goal semantics | REPORTED |
| 16 | Purpose of My Clinical Workspace unclear/redundant | PR3 | Task-oriented therapist home | REPORTED |
| 17 | Historical Sessions expanded by default | PR3 | Default collapse; active session retained | REPORTED |
| 18 | Adding session activity requires image-first picker and optional drag/drop | PR3 | Keyboard/mobile alternative, no unapproved images | REPORTED |
| 19 | Configuring activity has excessive dropdowns | PR3 | Progressive form, distinct outcomes/assistance | REPORTED |
| 20 | Synthetic dictation developer UI confuses therapist | PR3 | Move test controls away; real STT belongs to M8/governance | REPORTED |
| 21 | Therapy Plan too overwhelming | PR3 | Collapse details by default | REPORTED |
| 22 | Assessments lack field guidance | PR3 | Specialty-aware clinician reviewed help | REPORTED |
| 23 | Report and Plan creation require guided wizards | PR3 | Draft-only save/resume, validation and versioning | REPORTED |
| 24 | Practice Feedback mixes unrelated handover/plan requests | PR3 | Separate family feedback, staffing and plan requests | REPORTED |
| 25 | Activity creation needs optional image upload | PR4 | M5-14 private quarantine/scan/rights, no publish without approval | REPORTED |
| 26 | Activity buttons differ without explanation | PR1 | Consistent collapsed action menu, ownership labels, permission-respecting items | IN_PR_461, NOT QUALIFIED |
| 27 | Therapist specialty/responsibility checkbox appears editable but is controlled | PR2 | Read-only grants + admin request/approval, no self escalation | REPORTED |
| 28 | Guardian activity cards, Record button and excess whitespace | PR5 | Warm, compact image-first cards; collapse reduces height | REPORTED |
| 29 | Family Documents wrongly points to Progress | PR5 | Dedicated guardian-scoped released-document destination, M9 policy | REPORTED |
| 30 | Guardian Progress Updates need same child tabs as Home | PR5 | Exact linked-child scope; unreleased progress stays sample-only | REPORTED |
| 31 | Home Practice / Activities at Home naming confusion | PR5 | Unified purpose and navigation | REPORTED |
| 32 | Dark theme leaves top/sidebar and shared navigation surfaces white outside the guardian home too | PR1 | App-wide shared shell/layout audit across Platform Admin, Centre Admin, Coordinator, Therapist specialty variants, Supervisor and Guardian; verify light/dark support and all routes where available | IMPLEMENTED_IN_PR_461 (all role shells + semantic tokens + 7-role Chromium check); GLOBAL NOT QUALIFIED pending exact-head CI and manual review |

## Mandatory observation 32 verification (global dark-theme scope)

- Inventory which themes are actually available by role and route; do not silently introduce unsupported staff dark mode or assume a Guardian page is the only affected surface.
- Inspect the shared desktop sidebar, top bar, mobile navigation / More sheet, dialogs and nested panels across every applicable user role, including switching routes and user contexts.
- Fix the shared token/surface cause rather than a one-page override; use explicit variants if different role themes are intentional. Preserve generic navigation and accessibility.
- Verify at 320/390/768/1024/1440px with screenshots, light/dark toggles, reload/first-paint, contrast, keyboard focus, and denied-state screens. Record per-role per-route evidence; no PASS until truly observed.
- PR #461 now updates shared semantic colour tokens for staff and family, real ProductShell and design-preview AppShell, and adds seven-persona × five-width Chromium checks of header, side/mobile navigation and canvas. **Automated and owner visual acceptance remain NOT_QUALIFIED until the final commit passes all gates.**

## Sequencing and safety

- PR1 shared foundation first; merge only under AGENTS.md Rule 16.
- PR2 and PR3 may run independently **after PR1**; reconcile shared files against latest main.
- PR4 media safety and PR5 family surfaces may progress independently, but publishing illustrations or private family records must wait for separate rights/clinical/privacy review.
- A PR may address screen-level UX without closing a broader roadmap issue whose backend, legal, clinical or security gates remain open.
- Closing **M5 #168** requires individual issue DoD reconciliation, owner usability evidence, approved illustration inventory/rights coverage, no unaddressed P0/P1, and clinical G2/G2b NO-GO preserved.
