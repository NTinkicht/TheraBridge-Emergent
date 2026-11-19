# M5 WU4-J — Rights and provenance evidence

## Implemented (isolated; no production media capability)
Pure fail-closed consistency verifier requiring scoped tenant/activity/media draft IDs, immutable template version and candidate digest, independently named reviewer, source/license/attribution, generated provider terms and exact reviewer-digest/version/center/draft match. Returns rightsReviewObserved only; clinicalReviewObserved=false, approved=false, publishEnabled=false and readEnabled=false. No endpoint or rights grant.

## Technical regression evidence
Synthetic Jest test added in apps/api/test. Exact-head full CI, eight API/Web >=90% thresholds and independent Codex P0–P2 review PENDING at initial opening; do not infer a pass from other PRs. Manual real-media AV, image safety, rights, license and clinical review NOT RUN / NOT OBTAINED.

## Remaining integration
Use trusted persisted records, authenticated independent reviewer and actual legal verification; store immutable versioned signed audit evidence, review expiration and revocation, tie candidate to actual object and scanning, then require separate design and clinical sign-offs before considering any publication.

Clinical G2/G2b remains NO-GO, image publication remains disabled, and M5-14 #197 stays open.
