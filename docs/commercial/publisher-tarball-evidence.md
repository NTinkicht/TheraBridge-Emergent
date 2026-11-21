# COM-02: Bounded authoritative npm tarball evidence (engineering wave 4)

**Status: technical artifact evidence only. NOT LICENSE CLEARANCE, NOT A FULL DEPENDENCY AUDIT.** Tracks #313 and #327.

The frozen lockfile declares an integrity checksum, but that declaration alone does not verify package bytes. This wave independently downloads a *bounded sample of up to eight exact installed direct-dependency versions* from the allowlisted HTTPS npm registries and checks each tarball against the Yarn `integrity` field. Successful downloads yield a SHA-256 of the entire tarball and SHA-256 digests, lengths, and filenames of matching **top-level `package/LICENSE`, `package/NOTICE`, `package/COPYING`, or `package/COPYRIGHT` files**. No full license text is uploaded publicly and no license is automatically considered approved.

## CI and provenance

Run after the installed license and lockfile evidence has been generated:

```sh
node --test scripts/commercial/verify-published-tarballs.test.mjs
node scripts/commercial/verify-published-tarballs.mjs \
  /tmp/therabridge-installed-lock-provenance.json \
  yarn.lock docs/commercial/direct-license-evidence.json \
  /tmp/therabridge-publisher-tarball-evidence.json
```

The new JSON is archived alongside the three existing installed license evidence files in `therabridge-installed-license-files-<commit-sha>` on **full CI runs**, with the usual artifact retention period. Evidence points to the precise input lockfile SHA-256. No repository dependency, runtime route, billing, permissions, clinic workflow or legal grant is changed.

The code hard-limits compressed and uncompressed tarball sizes, number of downloads, individual license file size, network duration, and accepted HTTPS hosts. It rejects redirects and avoids writing downloaded archives into the repository. It compares exact tarball bytes to SRI with constant-time digest comparison; any confirmed integrity mismatch **fails CI**. Registry outages, timeout, absent/ambiguous lock mappings, no top-level license and unselected dependencies are explicitly tracked rather than reported as verified. The bounded sample is **not** complete coverage.

## Legal/technical gaps that stay open

- Determine package-license authenticity, copyrights, SPDX identifiers and specific legal obligations, with authenticated publisher evidence and qualified reviewers.
- Separate **SaaS hosting/network** obligations from **enterprise redistribution/on-premises licensing** obligations, including transitive, optional, build-time and runtime dependency sets.
- Resolve published tarballs without supported integrity declarations, redirects outside the strict registry allowlist and packages absent from installation; investigate anomalies before accepting.
- Review OS/container components, Redis/PostgreSQL/Node distribution, fonts, icons, logos, illustrations, AI models, dataset rights and attribution.
- Audit all remaining direct and transitive packages beyond the bounded sample, record exception owners and final package notices privately before any lawyer-approved public notices.
- Confirm COM-01 ownership rights and relevant contracts. Keep customer agreements unsigned; no proprietary root LICENSE, legal approval, commercial activation or real clinical data. G2/G2b remain NO-GO.

**All rows preserve `legalApproval=false`; a verified tarball is not permission to redistribute it.**
