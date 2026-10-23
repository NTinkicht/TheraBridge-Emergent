# TB-EM-020 — Activity library: duplicate and author-edit (synthetic-only)

## Goal and scope
Enable authorized clinicians to duplicate visible fictional activity templates into a new centre-owned template and customize their own activity with conflict protection. Backend only: no changes to Render, UI, QA fixtures, clinical signing, consent, release, media, or AI.

## Existing baseline
GET /api/centers/:centerId/activities lists centre templates and global fictional samples. POST /api/centers/:centerId/activities creates a centre-owned template. Plan/session workflows already freeze server-captured template snapshots.

## New backend contracts
- POST /api/centers/:centerId/activities/:templateId/duplicate — request body {title}; copies centre or globally shared synthetic template content to a fresh centre-owned record at version 1. No original mutation or global publication.
- PATCH /api/centers/:centerId/activities/:templateId — full editable content plus expected integer version; author only, immutable service/author, atomic WHERE version update. Conflict = HTTP 409.
- Create/duplicate/update require centre.activities.manage and revalidate live membership; therapist writes require the corresponding current membership specialty. Expired trial changes remain blocked.
- Centre event metadata records template ID, source ID/version where applicable, and actor but no medical free text.

## Safety and policy
- Cross-tenant records are not accessible through duplicate/update; global synthetic samples are read-only originals.
- Existing immutable plan/session template snapshots remain unchanged when the reusable library version changes.
- No private/public sharing, cross-centre publication, moderated library, image/media processing, clinician-facing editing UI, billing, or new clinical authorization.
- Existing supervisor management permission is preserved but author-only edits apply equally.
- All data and tests remain fictional/synthetic. No Render redeploy or production/pilot operations.

## Qualification
- Real-PostgreSQL integration regressions include wrong-specialty/admin denial, clone-by-peer, author-only edit, stale version 409, global sample unchanged, guardian sample boundaries, and event auditing.
- Existing clinical and security tests plus full exact-head GitHub CI and independent review must pass before owner decides whether to merge.
- Authoring-time test result: NOT RUN. This PR must remain DRAFT and unmerged until reviewed.

## Future work
Formal private vs centre vs moderated-public visibility policy, safe sharing, activity tagging/search, clinician UI, usage analytics, and version content history.