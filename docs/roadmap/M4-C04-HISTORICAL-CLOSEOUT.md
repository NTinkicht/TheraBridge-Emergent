# M4-C04 — Historical reconciliation / closure preparation

**Workstreams:** #183 and M4 epic #167. This PR is an independently reviewable **evidence-gate implementation**, not an assertion that milestone M4 can close before C01–C03.

**Baseline:** frozen 75 pre-roadmap historical issues, individual evidence-bearing rows in `M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv`, and a separate register validator already merged. This tranche implements a conservative closure eligibility gate: pending/partial/policy-blocked findings remain explicitly unresolved, reviewed provenance is mandatory for verified cases, and zero blind mass closures occur.

**Acceptance:** runnable negative tests for missing evidence and inaccurate closure claims, no automated issue closure without owner-approved evidence, six exact-head CI and independent review. A final M4 completion dossier may only claim acceptance once all required workstreams, relevant controls, reviews and synthetic QA receipts qualify. No clinical activation or real data.
