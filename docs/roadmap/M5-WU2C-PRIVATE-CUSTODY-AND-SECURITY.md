# M5 WU2-C — private-host security, encrypted custody and retention continuation

**Scope:** M5-14 #197 / M5-15 #198; continuation of merged WU2-C derivative PR #488 (`e17fc1202e7f11fb4024a90124b315c2457fc2d6`). All private-only. M5-12/16/17 image publication remains blocked.

## Delivery

- `scripts/qa/m5-wu2c-private-custody.mjs` is an **operator-only** synthetic illustration stage, deliberately not imported into the Nest API, workers, Next.js, or HTTP controllers.
- Takes the existing SHA-pinned 25-item `m5-b-v1` plan and validated 1600×1200 master; calls merged #488 for deterministic 1200×1200/400×300 derivatives.
- Production scanner adapter uses **local UNIX socket** `/run/clamav/*` or `/var/run/clamav/*` with PING, VERSION, streaming scan and strict clean verdict; each of the master, square and card must be scanned **individually** before write. No remote scanner or browser-provided verdict.
- The operator-only stage requires independently injected `TB_PRIVATE_DATA_KEY_B64` (exact canonical 32-byte base64 key). Generates random bundle identifiers, uses AES-256-GCM with context-bound AAD, writes all three files exclusively with 0600 permissions beneath a private 0700 root, and commits by atomic directory rename. No public filesystem path, key, signed URL, image bytes or read permission is returned.
- A bounded, HMAC-chained, fsynced append-only local audit log records `QUARANTINED`, `PURGE_REQUESTED`, `PURGED` events; audit tampering refuses subsequent operations. This is a **local tamper-evident record, not a remotely anchored/WORM audit service**.
- Retention policy is 1–30 days (default 7). Purge refuses early deletion, wrong keys/bundle IDs or malformed manifest, and requires an explicit exact-manifest, operator-supplied no-legal-hold clearance. The clearance is **not** an independently signed legal hold judgment; a privileged human/operator must verify it outside this tool. Crash recovery, orphan reaper and key rotation remain open.
- Strict no-publish/no-guardian/no-clinical-release flags are always returned, even when all private scanning succeeds.

## Security truth / release blocks

| Area | Engineering result | Production qualification |
|---|---|---|
| 1600×1200 master/crop/card | Implemented in merged #488 | Real assets not provided |
| PNG integrity and sample decoding | Adversarial tests in #488 | Independent sandboxing and media safety NOT VERIFIED |
| Local ClamAV socket scanning | Implemented transport, fail-closed | Deployed scanner/negative control NOT VERIFIED |
| AES-GCM, private file permissions | Implemented operator-only | Persistent encrypted S3 storage, backup/recovery and key rotation NOT VERIFIED |
| Retention/purge/legal hold | Executable with explicit operator clearance and HMAC evidence | Legal policy, independent authority and recoverability NOT APPROVED |
| Tamper-evident audit | Local hash chain | Trusted immutable central audit NOT QUALIFIED |
| Provider-side generation | WU2-B planning/rights-hash provenance only | Real provider/model credentials, execution, cost and rights proof NOT IMPLEMENTED |
| Asset-specific clinical/design/rights | No signed authorizations in source | NOT QUALIFIED |
| Published/guardian images | DISABLED | Still DISABLED |
| G2/G2b | NO-GO | NO-GO |

**Owner reports** visual owner/design, clinical concept screening and legal/IP choices accepted. Do not re-run the unchanged 25 concept review; independently verified signing identities and per-production-asset approvals still cannot be substituted by these conversations or CI.

## Engineering checks

Blocking Node tests `node --test scripts/qa/m5-wu2c-private-custody.test.mjs` include valid synthetic encrypted three-asset staging, scanner denial/mismatch, symlink/public path/invalid key refusal, retention expiry + legal hold and manifest permit enforcement, tamper-evident audit journal and no-read/no-release receipts. Runs in original full-mode `demo-journey` alongside 8× >=90% API+Web coverage. Exact-head full CI, Codex independent review and all Rule 16 checks required before merge.

## Required next phase

Provision and independently qualify real production private object storage, secrets/key rotation, AV negative-control tests, backup/restore and deletion policy with legal-hold authorization. Implement durable transactionally bound operator job/status persistence, trusted human design/clinical/rights approvals, a provider adapter only after approved commercial terms, and actual production-size image master generation. **No image publication or patient upload until separately released.**