# M4-01 — Controlled source availability and authority gate (2026-11-08)

**Status:** Canonical source repository READABLE, implementation traceability NOT VERIFIED. Do not confuse a controlled draft or a Figma frame with an approved requirement or a tested workflow.

## Verified private source pointers (read-only)
- [Canonical source index](https://github.com/NTinkicht/TheraBridge/blob/main/specs/README.md): blob `a4092e465ae138d46fa26b19eb7d1be850f39b07`. Five controlled candidate specs, historical/recovered registers, unsigned 103-operation role matrix and owner decision gates.
- [SRS](https://github.com/NTinkicht/TheraBridge/blob/main/specs/CB-SRS-001.md): blob `7d7186e660fa0d5b14a2a3cbc7b0a446cc352687`.
- [UX design](https://github.com/NTinkicht/TheraBridge/blob/main/specs/CB-UXD-001.md): blob `a795366f457c7954fd2a260c755dad6d4d8a7f71`.
- [Provenance manifest](https://github.com/NTinkicht/TheraBridge/blob/main/specs/provenance/import-manifest.json): blob `db8ea0df3402d47c1a38a417eaf7e19118a91195`; identifies V0.9.16 reviewed candidate (not approved).
- [Figma-derived latest flowmap](https://github.com/NTinkicht/TheraBridge/blob/main/site/data/latest.json): blob `126132d4502eded69970ca8e3511ab771d4942b2`, export 2026-11-01 08:53:26Z, 1,294 frames, 3,150 edges. It is NOT a 1,023-step runtime acceptance inventory.

## Mandatory restrictions
The authoritative private source explicitly describes V0.9.16 as a **CONTROLLED DRAFT / UNSIGNED** and marks G2/G2b NO-GO, G3 NOT AUTHORIZED, G4–G7 NO-GO. Its 103 proposed OpenAPI operations and 65 unsigned role mappings are not permission to generate/live-activate clinical features. Owner-approved TB-EM-052/053 development-only policies do not supply clinical/privacy/security signatures.

## Historical step-register source now recovered and hash-verified

- Private owner workbook: `TheraBridge_V1_Exhaustive_Workflows_Step_Screen_Audit.xlsx`; 237,877 bytes.
- SHA-256: `cc7e2d76b15d77853d08d726d4f1aa1e7ade0031ce115372056f1b7c5e15fee4` — agrees with source-workbook record embedded in the owner's preserved full-specifications annex.
- Parsed sheet `Step-Screen Audit`: exactly **1,023 distinct nonempty Step IDs**, across **90** V1 workflows. `Workflow Catalogue` has **91** rows, with `WF-X6` explicitly V2-excluded.
- Step coverage statuses: **108** `Mapped design — verify`; **880** `No exact step→node mapping`; **35** `QA evidence not executed`. Sum = 1,023. The historical design workbook is controlled draft / unsigned and does not prove implemented API/UI/tests or live Figma sign-off.
- The private workbook's step prose/figma mappings are **not duplicated into the public Emergent repo**; record proof, metadata and secure source route only.

## Required M4-01 evidence still missing
1. Reconcile each of the existing 66 feature, 91 workflow, and 55 owner-requirement rows against these pinned controlled sources, actual merged Emergent code/test HEAD and required owner/policy decision. The current crosswalks remain `PENDING_VERIFICATION` until this is done.
2. The historical original **1,023-step** workbook has now been located and SHA-256 verified; next reconcile EACH unique step ID to source, current Figma node/state, API/UI/DB behavior, positive/negative test, and blocked/approved policy outcome. Do not confuse the historical 108 design-mapped rows with executed acceptance.
3. Link test case IDs, actual CI or hosted sanitized receipts, and clinical NO-GO disposition per row. Historical 75-issue reconciliation remains independently tracked under M4-09.
4. Obtain independent evidence review and accountable owner signoff before closing #175/#266.

Evidence source links point to a PRIVATE repo; do not mirror controlled specification content into the public application or logs.
