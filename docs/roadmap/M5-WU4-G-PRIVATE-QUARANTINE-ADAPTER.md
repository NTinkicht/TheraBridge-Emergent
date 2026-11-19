# M5 WU4-G — Private quarantine write adapter

**Status: isolated local storage implementation; no authenticated upload endpoint.**

## Delivered
- Real private filesystem write of candidate bytes to an operator-selected absolute quarantine root (must be private mode 0700), with generated per-attempt key and 0600 exclusive file creation.
- Rejects public/static roots, traversal/foreign center keys, symlinked directories, group-readable roots, stale byte counts, mismatch between preflight and candidate SHA-256, and forged publication/read flags.
- Receipts contain only hash, length and fail-closed flags; no object URL, filesystem location, read API or public bytes.
- Tests use synthetic headers and temporary filesystem only. The private filesystem is **not** a production replacement for S3-compatible encrypted object storage.

## Not done; mandatory subsequent engineering
- Authenticated POST binding, CSRF, tenant + membership + specialty + activity ownership + draft status and immutable version checked in one DB transaction.
- Configured cloud object store private IAM, encryption, scoped write-only grants, transactional association, quota/retention, audit, orphan/revocation, crash-recovery and concurrent key race protections.
- Complete PNG structural/inflate checks, sandboxed actual pixel decoder, malware scanner, derivative generation, rights/clinical reviewer approvals and immutable release projection.
- Five widths, screen readers, low-bandwidth, manual rights clearance and clinical checks NOT RUN.
- Full exact-HEAD CI and Codex review required; G2/G2b NO-GO and images never approved/published.

**Issue:** #197 stays open. Independent from WU4-H PNG verifier; merging both does not make private media production-ready.
