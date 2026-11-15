# COM-02 — cryptographic OCI candidate claims, without assuming commercial rights

## Implemented verification boundary

The previous merged PR #362 can capture local candidate image filesystems and merge one SaaS and one Enterprise edition. This PR adds `scripts/commercial/verify-oci-dsse.mjs`: a bounded, offline **DSSE Ed25519 signature verifier** for an in-toto Statement v1 carrying the exact **two candidate OCI image digests and deterministic file-inventory SHA-256s**.

The verifier requires an **independently supplied expected SHA-256 fingerprint of the signer's DER SPKI public key**. It rejects a mismatched fingerprint even if an attacker controls the signed envelope and public key. It checks the DSSE pre-authentication encoding, canonical base64, one Ed25519 signature with matching keyid, exact statement/predicate/subject schema, both edition names, exact image references, digest pins and inventory hashes; a new exclusive output file records the validated claim. There is no fallback to unsigned JSON, inferred tags, unsafe paths, mutable refs, repository metadata or signature claims alone.

### CLI

```sh
node scripts/commercial/verify-oci-dsse.mjs \
  /secure/combined-candidates.json \
  /secure/external-signed-dsse.json \
  /secure/trusted-publisher-public-key.pem \
  THE_INDEPENDENTLY_APPROVED_LOWERCASE_64_HEX_SPKI_SHA256 \
  /tmp/com02-oci-signature-review.json
```

The fingerprint **must be obtained and approved independently of the envelope and key file**. Never infer it from an untrusted attachment or copy it from a self-attested publisher field. Signature verification establishes only that the matching key signed the specified claim; signer identity, authority, registry publication, release deployment, signer key rotation, trust distribution, timestamp and transparency-log status need *separate independent evidence*. A user-controlled signature of an unverified Docker export **does not** prove an actual customer release. In particular the output explicitly keeps `signerIdentityOrAuthorityIndependentlyVerified:false`, `registryArtifactOrDeploymentIndependentlyVerified:false`, `commercialApproval:false`, `finalNoticesIssued:false`, and clinical G2/G2b false.

## Acceptance and remaining follow-up

- Exact-head offline adversarial tests (ephemeral generated keys, forged signature, wrong trust anchor, signed wrong digest/inventory, swapped edition, forged approval, malformed envelope) are required in full CI.
- No genuine signed SaaS or Enterprise OCI release evidence is currently supplied. Do **not** populate the empty checked-in `release-file-evidence.json` or issue commercial notices without authoritative release proof.
- All 53 npm publication-to-source matches and 91 source assets still require independent evidence and counsel's distinct SaaS/network vs Enterprise/on-prem redistribution decisions. OS/base image, model/data suppliers, proprietary IP and external service terms remain unresolved. G2/G2b NO-GO is unchanged.
- This is a bounded technical qualification gate, not an automated grant, production deployment attestation, clinical gate transition or customer contract.
