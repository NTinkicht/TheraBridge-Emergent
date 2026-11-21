# COM-LAUNCH — Edition-specific commercial authorization gate

**PUBLIC NON-AUTHORIZING WORKING RECORD. NOT A LICENSE, CONTRACT, COUNSEL APPROVAL, CLINICAL APPROVAL OR CUSTOMER OFFER.**

Tracked by [#371](https://github.com/NTinkicht/TheraBridge-Emergent/issues/371). This adds a **fail-closed declaration and validation gate**, not a replacement for existing COM-01 #312, COM-03 #314, COM-04 #315, COM-05 #316 or COM-06 #317 documents.

The canonical public tracker `docs/commercial/launch-decision-register.json` deliberately has:
- `SAAS.status=BLOCKED` and `ENTERPRISE.status=BLOCKED` independently;
- no release digests, no counsel signatures or IP-owner claims;
- `commercialLicenseGranted=false`, no issued notices;
- clinical `g2=NO_GO`, `g2b=NO_GO`, no real patient processing or clinical release.

Run:
```bash
node --test scripts/commercial/verify-launch-decision.test.mjs
node scripts/commercial/verify-launch-decision.mjs docs/commercial/launch-decision-register.json
```

## Evidence and human decisions still required

**SaaS:** verified chain of title, authorized seller, existing MSA/SaaS schedule + DPA/privacy, SaaS network-use rights for actually operated components, actual SaaS release scope, asset rights, licensed service provider and counsel/owner approval.

**Enterprise:** verified chain of title, seller, existing MSA/Enterprise deployment schedule, actual image digest and included runtime/native/OS assets, third-party redistribution rights, verified notices, authorized service/maintenance terms and separate counsel/owner decisions. Never infer enterprise redistribution rights from SaaS rights.

Sensitive source contracts, contributor signatures, customer identity, privileged legal advice, and signed lawyer opinions must be kept outside this public repository. Record only non-sensitive approved version identifiers and independently verifiable release attestation references in future controlled evidence; no self-issued approval is accepted by this public validator.

## Scope of this initial guard

This first verifier intentionally **cannot produce APPROVED** even when a file is edited to claim approval. A future permissioned approval mechanism must use separate externally validated signed evidence and explicit authorization, with per-edition digest/identity binding, before any status can transition. Do not weaken this validator to turn checkboxes into a license.

The 53 outstanding npm source/rights records (#356), 91 assets and true release OCI distribution scopes (#360), IP ownership (#312), and clinical G2/G2b gates remain separate blockers, subject to actual edition scope. Existing detailed contracts are in `docs/commercial/contracts/CONTRACT_PACK_DRAFT.md`; do not duplicate them.
