# M5-05 R3 — Child/center scope-transition fail-closed acceptance

**Predecessor:** #406 merged as `3375384e5f0643501c79f5e7c88910974af4d662`.
**State:** DRAFT PLAN — NOT IMPLEMENTED / NOT TESTED / NOT APPROVED.

## Risk to validate, not yet a proven incident
The current `ClinicalChild` hook uses `useLoad(fetcher)` and holds a prior `data` value while `fetcher` changes; existing async guards discard stale *responses*, but the view must separately prove that an old child/center projection is not displayed while a new authorized request is pending. Dynamic route reuse and context switching need real-browser evidence. Do not infer an actual disclosure without reproduction.

## Planned work
1. Reproduce the route transition in isolated synthetic CI, with a held GET for a different seeded child (or a synthetic nonexistent target if a second assigned child is unavailable); observe loading/error/denied behavior without exposing prior clinical content.
2. Ensure the clinician workspace remounts or clears scoped data whenever the `centerId:childId` identity changes. Preserve current role, assignment, specialty and server-side checks; do not rely on UI hiding as authorization.
3. Prove the old, delayed response cannot replace the new child's view; test stale response ordering, 404/403 blocked outcomes and explicit recovery, at least 320/390/768/1024/1440 as applicable. Avoid using real patient identifiers or payloads.
4. Record before/after synthetic browser assertions, source regressions, audit results and the four Rule 7 handover files; require all six full CI checks, independent exact-HEAD Codex review and reviewer disposition before merging.

## Immutable boundaries
Only isolated loopback `*_demo_test`; no screenshots containing clinical narratives archived. Default `NEXT_PUBLIC_M5_CHILD_COMPACT` **OFF**; G2/G2b clinical **NO-GO**, no signing, consent/release, or production deployment. Manual human screen-reader, visual and workflow owner acceptance remains NOT OBTAINED; issue #188 OPEN.
