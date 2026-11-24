# M5 observation #25 — local activity image readiness, not upload (PR #477)

Source: M5 owner manual feedback (2026-11-22), observation 25: "Activity creation needs optional image upload." Parent rights/media issue #197.

## What is newly executable
- Existing staff activity-library actions allow authorized therapist author or supervisor to open a private media metadata-draft panel.
- The panel now offers a **completely local, ephemeral** PNG header/dimension check before staff prepares artwork metadata, with text stating that no file is sent or saved.
- Browser checks PNG signature and IHDR parameters only (first 33 bytes), matching server preflight upper limits: 8 MiB, 4096 pixels per edge, 12 million pixels; allowed noninterlaced 8-bit RGB/RGBA. Returns dimensions and byte count only, never selected filename, bytes, URL, or preview.
- Selection is invalidated on new choice and component unmount, and staff context/activity/version gives the embedded check a fresh keyed instance. Clearing the HTML input lets staff retry without retaining File objects.
- Jest-mounted tests check correct/incorrect headers, MIME, size, dimensions, async replacement, no filename exposure, no HTTP/object URL and integration under existing activity/version scope.

## Security, clinical and product boundaries
This is a **browser UX helper**, not a malware scanner, image decoder, upload, storage-admission capability, rights verification, license grant, approved illustration or publication. A forged client can bypass the helper and may not bypass any future server-side checks. Existing center.activities.manage authorization guards the containing proposal panel; **no new API/permission** and no real file bytes reach any server. No new static/public media path, DOM image preview or browser-generated URL is permitted.

**Still blocked:** owner-approved production private encrypted storage, trusted malware scanner, sandbox decoder and complete PNG integrity, immutable version/digest capture, legal media rights, clinician/design approval, retention/revocation, private delivery, consent and scoped server access. Follow #197, #464, #465 where policies apply. Clinical G2/G2b stays NO-GO. Observation #25 must remain **PARTIAL/OWNER_ACCEPTANCE_PENDING**.

## Qualification and receipts
- Full exact-HEAD CI and Smart CI gate, eight >=90% API/Web metrics, independent final-HEAD Codex disposition and required QA/handover records.
- Manual redacted five-width (320/390/768/1024/1440), keyboard/screen-reader, no-file/invalid/busy/state switch checks and owner acceptance **NOT RUN** at PR opening.
- Do not infer release capacity, real-media safety, clinical approval or completion of M5-14 from this bounded increment.
