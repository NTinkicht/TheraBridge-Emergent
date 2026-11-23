# WU2-A operator-only production media security preflight

This is a live runtime connectivity/encryption probe, NOT an approval or an image release mechanism.
Within the authorized server host, with independently provisioned secrets:
  node scripts/qa/m5-media-operator-probe.mjs

It tests the canonical TB_PRIVATE_DATA_KEY_B64 for 32-byte AES-256-GCM usability and the existing TB_MEDIA_CLAMD_SOCKET local UNIX socket for PING, VERSION and a synthetic clean INSTREAM scan. It does NOT use real patient media or print keys, socket paths, scanner versions, access tokens or candidate data.

Must be separately evidenced by authorized operators: actual encrypted DB candidate roundtrip; scanner negative EICAR control (without uploading malware to real sessions); permission and cache isolation; key rotation/recovery; legal holds; storage/backups retention and purge; vulnerabilities; privacy risk assessment; service deployment and logs; reviewer signoffs. The script marks these NOT_VERIFIED and independent review NOT_APPROVED regardless of connectivity.

Default output is BLOCKED_RUNTIME_NOT_VERIFIED until run inside a trusted host. No CI synthetic fixture can qualify real infrastructure. No application API or approved-media read path is created. G2/G2b clinical NO-GO and style/legal/clinical approvals remain unchanged.