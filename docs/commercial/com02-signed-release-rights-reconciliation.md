# COM-02 — signed local OCI candidate to rights reconciliation

This is a follow-up to merged PR #363. The tool `scripts/commercial/reconcile-signed-release-rights.mjs` combines the complete exact-version/package/source-asset rights queue with SaaS and Enterprise Docker-export candidates and the detached Ed25519 DSSE signature. It **does not trust a caller-supplied "verified" JSON receipt**. It re-verifies the signature directly against a separately supplied trusted public key fingerprint and binds the signed digests and file inventories to the exact two-edition capture, then runs `reviewReleaseScope` on the same manifest and complete bulk rights queue.

Example, once separately sourced artifacts exist:

```sh
node scripts/commercial/reconcile-signed-release-rights.mjs \
 /secure/com02-bulk-rights-evidence.json \
 /secure/two-edition-local-captures.json \
 /secure/external-signed-dsse.json \
 /secure/approved-public-key.pem \
 APPROVED_LOWERCASE_SPKI_SHA256_64_HEX \
 /tmp/com02-signed-local-candidates-rights-review.json
```

The output is a *technical counselor/rights-holder review queue*, not a release receipt. It retains every version and source asset and its distinction by SaaS and Enterprise edition, with two clearly separated facts: **byte hash present/absent in signed local candidate image inventory** and **no independently verified registry publication/deployment/rights**. Even signed local absence does not prove exclusion from deployed artifacts; no package source correspondence is inferred. No signed example artifact or authoritative publisher key is bundled.

**Always NO-GO without independent evidence:** authentic release provenance, source-to-publisher npm attestation of all 53 exact versions, license and notice completeness, rights holder clearance for 91 source assets, OS/container/Redis/Postgres/fonts/brand/media/AI/data dependencies, SaaS/network obligations vs customer managed enterprise redistribution, and independently authorized legal contracts. Signature verified against a key hash is not signer authority. No `THIRD_PARTY_NOTICES`, commercial license, release permission, or G2/G2b clinical gate is issued.

The adversarial test suite covers missing package and asset rows, forged rights, corrupted captures, mismatched image digests and inventory hashes, invalid detached signatures, and publisher impersonation. CI runs it along with existing package/asset inventory and signature tests.
