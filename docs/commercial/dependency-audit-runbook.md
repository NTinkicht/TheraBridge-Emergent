# Dependency inventory runbook (COM-02)

Use Node 20 or later from repository root:

```sh
node scripts/commercial/inventory-direct-deps.mjs --output direct-dependency-inventory.json
```

This command reads only the three known package manifests and writes JSON to the named local path. Do not commit the generated inventory unless reviewed. **It does not fetch license metadata, verify lockfile resolution, cover transitive dependencies, scan vulnerabilities or constitute an SBOM.**

### Required follow-up

1. Pin the commit SHA, enumerate *all* manifests and manifests for other ecosystems in the repository.
2. Produce CycloneDX or SPDX SBOM from the installed, lockfile-frozen production and development dependencies, with scanner version and repeatable commands recorded.
3. Cross-check declared licenses against actual published package LICENSE and NOTICE files; do not rely solely on registry metadata.
4. Include container base/OS packages, redis/postgres images, runtime packages, static font files, Lucide icons, logo, screenshots, task catalogue illustrations, model provider terms and any embedded datasets.
5. Record attribution, redistribution, patent, copyleft and SaaS/network-use requirements separately, and have qualified counsel adjudicate ambiguous cases.
6. Reconcile any historical secrets finding with existing pinned Gitleaks CI, using non-secret rule/path references only.

See `initial-license-audit.md` for the current risk register. Completion of this direct inventory alone does **not** clear issue #313.
