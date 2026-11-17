# WU4-C — Private illustration proposals

This UI is explicitly **metadata-only**. There is no upload, preview, approval, release, or generated-image publication. It operates only for staff with center.activities.manage and centre-owned templates, uses CSRF/session-aware REST, preserves entered data after errors and requires explicit rejection reasons. The staff activity library and guardian-facing synthetic sample library remain separate.

Before enabling real images: implement a verified private object-storage adapter, server-side content validation, storage/retention, independent approval, rights evidence, approved-version snapshot, signed delivery and proper guardian consent/release gates. Screen-reader/visual manual acceptance and five-width screenshots still required. No M5-14 or M5-12 completion claim.


## Full historical proposals
The staff-only panel loads 50 drafts at a time using centre-scoped UUID cursors. Older pages append to the existing list without replacing newly saved or rejected entries, and submitting/rejecting pauses during pending pagination. The server retains the approval/release NO-GO state.
