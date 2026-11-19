# M5 WU4-I — Private scanner attestation

## Implemented (isolated; no production media capability)
Pure fail-closed internal scanner attestation on a snapshot of bounded candidate bytes. Requires a trusted injected scanner to return matching SHA-256, byte length, CLEAN verdict, engine and signature-set version. It rejects offline/invalid/unsafe scan claims. No live scanner connector, upload endpoint, release transition, real image or AV clearance claim.

## Technical regression evidence
Synthetic Jest test added in apps/api/test. Exact-head full CI, eight API/Web >=90% thresholds and independent Codex P0–P2 review PENDING at initial opening; do not infer a pass from other PRs. Manual real-media AV, image safety, rights, license and clinical review NOT RUN / NOT OBTAINED.

## Remaining integration
Wire an audited, sandboxed production AV engine and authenticated private quarantine object access, verify scanner identity and signature freshness, transactional center/role/version binding, revocation and AV re-scan policies. Full image decoder/derivatives, rights and clinical approval remain required.

Clinical G2/G2b remains NO-GO, image publication remains disabled, and M5-14 #197 stays open.
