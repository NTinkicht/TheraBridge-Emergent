# M5-02 — Evidence-linked task areas and navigation architecture (source tranche)

**Status:** Proposed, not deployed, not user/clinical approved. Tracks #185, dependent on the closed M5-01 #184 and the still-open canonical-source reconciliation #266. The public repository's actual `ProductShell.tsx` has 20 permission-specific links to canonical pages; proposed groups below are a *reviewable design hypothesis* and do not replace the authorization layer.

## Task-area hierarchy proposal

| Task area | Existing destinations (current names) | Intended user mental model |
| --- | --- | --- |
| Overview | Home | Return to my workspace |
| Platform administration | Center applications; Centers | Onboard and oversee centers |
| Care delivery | Children; Schedule; Clinical workspace; Documents & review; Progress | Find a child, organize services, record and review |
| Collaboration & activities | Messages; Practice feedback; Activities (center permission) | Coordinate and share activities across care team |
| Family routines | Activities at home (family permission); Home practice; Progress updates | My child's daily routine and accessible progress |
| Center administration | Center setup; Access & consent; Team; Center details | Configure operations, staff, and restricted access |
| My account | My profile; Account security | Manage my personal profile and authentication |

**Cardinality:** 20 distinct permission-specific navigation entries mapped to 7 proposed groups. The **two Activities entries share a URL** but have different permissions and labels, and must remain separate. `Home` and `Account security` are session-shell entries with no additional ProductShell permission label; that is not a reason to bypass underlying API permissions.

### Information architecture principles

- Group by **task outcome**, not database entity or organizational chart. Preserve all authorized destinations; collapsing a group must not make a capability unavailable.
- The proposed desktop collapsible rail, mobile bottom navigation + More sheet, breadcrumbs, search/back and contextual hierarchy are **M5-03/M5-02 design work**, not implemented here.
- Compute visible groups only **after permission filtering**. Never infer grants from job title, display label, specialty or UI route. Server/API must remain the enforcement boundary. Never expose a center route merely because a guardian shares a physical URL.
- Keep action/state in context: center, child and specialty switchers require authorized server state; do not persist stale access across role changes.
- Confirm dynamic routes and non-primary entry pages separately; inventory classification is not evidence that a page is broken or can be deleted.
- Locked/blocked clinical actions remain visible as explicitly unavailable where clarity is required, **never turned into active sign, release, consent or real-AI affordances** while G2/G2b is NO-GO.

## Executable source receipt

`node --test scripts/qa/m5-task-areas.test.mjs` verifies complete mapping against the actual source NAV and canonical route inventory, distinct center/guardian grants, permission-limited visibility, and fail-closed behavior for unsafe destinations, duplicates, deleted assignments, and made-up source approval.

`node scripts/qa/m5-task-areas.mjs /tmp/therabridge-m5-task-areas.json` records the 7 task groups, 20 existing permission-bearing links, all non-primary canonical routes needing secondary-context review, and a **blocked** controlled-source reconciliation. The artifact contains route names, permission identifiers, and source-only status; no sessions, private data or clinical narratives.

## Controlled requirements gap (cannot claim completion)

The parent milestone's 66 original capabilities, 91 controlled workflows, 55 owner requirements and 1,023 historic workflow steps still require controlled versioned source/owner mapping under [#266](https://github.com/NTinkicht/TheraBridge-Emergent/issues/266). Until verified, the output explicitly records **0 authoritative row-level mappings** and `BLOCKED_CANONICAL_SPEC_NOT_AVAILABLE`. The 20 links **must not** be counted as 20/66 implemented capabilities or conflated with workflow coverage. Original feature #39 V2 and workflow WF-X6 exclusion policies are unchanged.

## Design/acceptance next

1. Verify historical role, specialty, child, guardian access and policy tasks against canonical signed 66/91 matrix; attach source IDs and authorization tests.
2. Review non-primary routes and actual task sequence for all seven personas. Propose and user-test breadcrumbs, progressive disclosure, search/More and safe locked states; create clickable wireframes.
3. Run full five-width browser, keyboard, screen-reader, contrast, low-bandwidth, light/dark family state and representative complete task usability checks before any M5-02 signoff.
4. Only after direction approval, implement M5-03 grouped/collapsible navigation without removing permission or clinical gates.

**Current qualification for this tranche:** six exact-HEAD required CI jobs, SBOM, Smart CI and independent Codex final-head zero unresolved before any merge. No hosted Render/Neon updates.
