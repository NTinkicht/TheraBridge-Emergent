# TB-EM-044 — Saved vs current report evidence consistency

## Scope and boundaries

This is an entirely read-only, permission-inherited comparison of a **selected saved ReportVersion.evidence** to the **current authorized ReportDetail.evidence** shown in the existing internal report-version inspector. It never changes the saved report, source evidence, clinician decisions or clinical version guard. No external provider, source re-fetch, PDF export, signature, release, consent or family access is added.

The source inventory is compared by **exact planVersionId + goalKey**, with a separate measure/title/baseline/target definition check. A goal with the same key but another version is NOT joined. Legacy entries without a planVersionId are reported as unverifiable rather than attributed. Observations are compared by recorded **source ID + calendar date + value** (including the saved prior point), not numeric aggregate trends. Missing source IDs are explicitly unverifiable rather than equal. Report period, saved/current assessment IDs and session counts are surfaced separately, with a caution on mismatching periods. Equal source record metadata does not authenticate sources or verify clinical interpretation.

## Display contract

The existing saved report vs current draft comparison adds a separate disclosure, “Compare saved vs current evidence records.” It shows an explicit status for each goal source, saved/current observation counts, assessment ID changes, session count changes and a report-period mismatch notice. This does not modify statement fingerprint or provenance verification performed by the existing server-issued `statementTrace`.

## Qualification

- Pure regression: matching version and identical source IDs, changed recorded values on same IDs, reused goal key under different plan-version IDs, missing source identifiers, changed goal unit, zero samples, omitted saved sources, newly included current-only source, assessment/session/period differences.
- Disposable seven-role Chromium: saved report inspector disclosure and truthful nonauthorizing notice, visible assessment/session/source diagnostics; existing width/role checks unchanged.
- Require six-job CI at exact HEAD, independent P0–P2 review and resolved conversations before owner-authorized merge. PR #103 from Slice 14 may merge independently and necessitate re-verifying the branch on the updated base.
- Hosted QA issue #61, production/signed releases, real-patient data, source adjudication and clinical approval remain unchanged and policy-gated.
