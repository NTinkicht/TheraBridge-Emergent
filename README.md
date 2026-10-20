# TheraBridge — Emergent development workspace

**Status:** Documentation-only bootstrap. **No application code, no tests, no clinical approval, and no production readiness claimed.**

This **private** repository is the portable application-development workspace for TheraBridge V1. Its contents will be developed with Emergent and independently audited outside Emergent. The separate private `NTinkicht/TheraBridge` repository remains the authoritative source of controlled product specifications and pending clinical/permission decisions.

## Start an Emergent job

1. Open https://app.emergent.sh and select **Full Stack App** → **Plan**.
2. Provide the owner's **TheraBridge_Emergent_Master_Blueprint_v2.md** and **TheraBridge_Emergent_Continuity_Protocol.md** as attachments (do not assume Emergent can read a private repo without OAuth authorization).
3. Tell Emergent to plan the **platform-admin / center onboarding** vertical slice before coding, use official Direction B color tokens, and explicitly assess stack feasibility.
4. Do **not** accept an unapproved stack substitution, invent approved clinical permissions, use real patient data, or publish the app.
5. First prove **Save → Save to GitHub** to a dedicated branch such as `emergent/phase-1`. If Emergent requires different GitHub steps, have it explain exactly how it handles existing repository history. Do not force-push or overwrite `main`.
6. Read `AGENTS.md` and `docs/handover/CURRENT_STATE.md`. Keep the history updated at every exported work unit.

## Non-negotiable portability

Code + tests + migration/seed + design tokens + API + documentation + setup instructions must remain runnable outside Emergent from a verified GitHub commit. GitHub export does **not** include managed database contents or secrets: document and test portable replacements and restore steps. Avoid untracked, Emergent-only implementation knowledge.

## Controlled boundaries

- Development and tests: **fictional/synthetic data only**.
- Protected clinical actions: **disabled by default** until owner-signoff on policy decisions.
- Clinical pilot/production: **NO-GO**.
- Do not assume Figma prototypes demonstrate functional backend behavior.
- The official design uses **TheraBridge** naming, Direction B colors, IBM Plex Sans, and a replaceable official logo asset.

## Reference documents

The owner's two local files referenced above are the initial self-contained brief. They are **not yet committed** to this repository. When the first Emergent checkpoint is exported, add them to `docs/product/MASTER_BLUEPRINT.md` and `docs/handover/CONTINUITY_PROTOCOL.md` (or commit them separately via PR) without changing the underlying decisions. This placeholder is not a claim the full specification is stored here.
