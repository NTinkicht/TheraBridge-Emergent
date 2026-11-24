# M5 owner observations 11, 13, 22–25 and 27 — combined PR #480

Date: 2026-11-23. State: IMPLEMENTED IN DRAFT, full exact-HEAD CI and independent review NOT YET QUALIFIED.

## Implemented
- **#11 child reported conditions, allergies, medication and other care:** Optional registration fields and editable restricted staff panel; separately versioned, authenticated encrypted AES-256-GCM PostgreSQL custody; explicit optimistic concurrency; authorized staff only, separate from child lists and audit event metadata. Source is FAMILY_REPORTED_UNVERIFIED, not diagnosis/prescription or release.
- **#13 optional child profile photo:** Staff uploads bounded 512 KiB PNG candidate; server checks full PNG structure/CRC/decompression, requires actual trusted Unix-socket ClamAV scanner and AES-GCM key, then stages encrypted data with no public access. Exact linked guardian may privately inspect candidate, consent explicitly, decline/delete and revoke/delete. Read rechecks original consenting link. No public/clinical release.
- **#22–24 clinical UX restoration:** Restore assessment specialty prompts, draft report/plan guidance and separated practice feedback/staff handover/plan request panels removed inadvertently by PR #475, along with their mounted tests and provenance document. Preserve all later guardian improvements and crosswalk.
- **#25 optional activity illustration:** Scan and encrypt user-selected PNG to exact author-owned/staff-authorized, versioned draft metadata proposal. Quarantined candidate remains unapproved, unpublished, unviewable to family or public. No bypass of image rights or human clinical/style review.
- **#27 privilege escalation:** Self-profile grant choices are read-only; self profile DTO excludes specialties/responsibilities; service rejects forged grant fields (even null/undefined), while existing administrator grant management remains intact.
- **M4-06 CI:** Replace docker port | head -1 under pipefail with loopback-only full-port parsing and redacted failed-line diagnostic; do not weaken replay checks.

## Deployment prerequisites
- TB_PRIVATE_DATA_KEY_B64 must be an independently provisioned 32-byte server-held base64 AES-GCM key. Missing/noncanonical key denies operations; do not share through source or CI artifacts.
- TB_MEDIA_CLAMD_SOCKET must point to an independently operated trusted local ClamAV Unix socket under /run/clamav or /var/run/clamav. Missing/unhealthy scanner denies image upload. No unchecked byte admission or permissive fallback.
- Neither operator prerequisites nor guardian consent are inferred by owner's authorization to implement; owner authorization is sufficient to build these features.
- All medical information is unverified context. No real-patient/demo data, signed records, publication, clinical release or G2/G2b GO from this PR.

## QA and acceptance
- New API AES-GCM adverse tests, real PostgreSQL care/guardian denial tests, mounted Web care/photo/guardian/illustration tests, restored source/mounted draft UI tests and main migration replay hardening.
- Required: exact-head all CI, 8 measured >=90% API/Web metrics, browser/tenant/guardian no-regression, image SBOM and security, independent final-head Codex review or explicitly owner-designated alternative, 320/390/768/1024/1440 redacted visual+keyboard+AT and owner acceptance.
- **All still NOT VERIFIED** pending live exact-head run and human acceptance. No fabricated result.
- The illustrated catalog M5 #195–200 remains separate work. Activities need explicit rights/licensing/clinician approval before ever publishing imagery.
