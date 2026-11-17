# WU-LIC-04 — Post-V1 commercial activation specification and deferred implementation contract

> **DRAFT / PRE-FREEZE / NOT AN OPERATIVE COMMERCIAL LICENSE.** No production billing, payment collection, trial expiry enforcement, account suspension, Enterprise installation activation, patient-data processing, or G2/G2b clinical release is authorized by this work unit.

## 1. Verified timing decision

At drafting, TheraBridge V1 is an **active synthetic proof-of-concept** (M5 and further roadmap milestones in progress). No signed/immutable feature-freeze approval is available. COM-05 [#316](https://github.com/NTinkicht/TheraBridge-Emergent/issues/316) and COM-06 [#317](https://github.com/NTinkicht/TheraBridge-Emergent/issues/317) require **runtime implementation after V1 feature freeze**. Accordingly this WU freezes only a reviewable **specification and offline executable invariants**. It intentionally adds **no production API controller, database migration, billing provider, emailed invoices, scheduled suspension, entitlement checks, or paid UI**. Synthetic V1 demo behavior and existing center trial states remain unchanged.

`wu-lic-04-activation-contract.json` is the machine-readable source, validated in CI by `scripts/commercial/validate-wu-lic-04-spec.mjs`. No value `TBD_FINANCE`, `TBD_CONTRACT` or `TBD_TAX_COUNSEL` is a price, quota, grant or approved tax determination.

## 2. Commercial packaging — two delivery editions and three plans

| Plan | Delivery | Non-clinical scope (draft) | Commercial limits |
|---|---|---|---|
| **Starter** | Owner-hosted SaaS | Center administration, scheduling, synthetic demonstration | Centers, staff seats, storage GB, AI credits, monthly price **TBD** |
| **Professional** | Owner-hosted SaaS | Starter plus non-clinical reporting and larger operational scope (subject to future approved UX) | All limits/overages **TBD** |
| **Enterprise** | Customer-managed **signed** licensed bundle | Professional-like non-clinical scope plus authorized managed installation | Named sites, seats, environments, storage, AI credits, annual price **TBD** |

The *Enterprise plan* is not an unconditional SaaS entitlement; it belongs only to the **Enterprise delivery edition**, requires a customer license and independently authenticated distributed-image digest. Commercial sales may later offer custom terms under separate owner/finance approval, but **do not fabricate tier limits or prices** in this spec.

No subscription provides an entitlement to clinician signing, patient AI processing, consent approval, therapist release, privacy/security bypass, unsupported medical features, cross-tenant access or relaxation of G2/G2b.

## 3. Tenant entitlement decision engine (post-freeze runtime design)

Source of truth: immutable, append-audited `CommercialEntitlement` (center/tenant ID, exact edition/plan, state, effective/grace/expiry timestamps, version, issuer evidence reference and legal grant ID) with `EntitlementTransition` (actor/authority, prior and new version, reason, source signed event hash, idempotency key, request receipt). Use separate `LicenseScope` for Enterprise installations and a provider-neutral `BillingAccount`/invoice ledger. **Do not repurpose** existing center clinical suspension, consent or role assignments as billing state.

A billing/trial state may limit **only newly requested paid non-clinical mutations**, after legal release approval. It may **never** remove a user's existing authorized read access, necessary safety handover, legally required export, privacy/access requests, audit visibility or incident response. Authentication and center/child/guardian RBAC always run *before* entitlement checks. Default on unknown or unavailable subscription service: do not grant paid new work, do not block safety and legally required operations, log a minimized, tenant-scoped audit event and alert the responsible platform operator. Explicitly avoid accidental cross-tenant scopes and unreviewed schedule/clinical workflows.

States: TRIAL → ACTIVE or EXPIRED/TERMINATED; ACTIVE → PAST_DUE/SUSPENDED/TERMINATED; PAST_DUE → GRACE/ACTIVE/SUSPENDED/TERMINATED; GRACE → ACTIVE/EXPIRED/SUSPENDED/TERMINATED; EXPIRED or SUSPENDED → ACTIVE with independently approved reactivation; TERMINATED is terminal unless a new commercial agreement/account is established. **Grace length and transition authority require owner approval.** Never use a subscription state as proof of clinical approval.

Decision contract: `GET /api/commercial/tenants/:tenantId/entitlement` for properly authorized tenant/admin read; `POST .../entitlement-transitions` for separately authorized platform commercial operators with `If-Match` and `Idempotency-Key`; provider-signed webhook endpoint with cryptographically authenticated signer and replay detection; and separate Enterprise installation activation. All are **design-only** and not currently wired into NestJS.

## 4. Billing, VAT, refunds and finance reconciliation (post-freeze)

Choose payment provider only after owner/finance/security counsel review. Payment flow: approved quote/order → signed customer agreement → tenant and provider customer mapping with no cross-tenant identifiers → provider-hosted checkout/approved invoice issuance → signature-authenticated webhook → deduplicated append-only financial event receipt → reconciled subscription transition → audit export. No PAN/card numbers, secrets, customer email lists, medical content or privileged contracts in payment logs or public GitHub.

Billing must handle idempotent retries, webhook reordering, duplicate events, provider outages, delayed settlement, chargebacks, refunds, partial failure, currency rounding, billing-cycle changes, concurrency, credits, graceful cancellation and recovery. UAE VAT, place of supply, reverse-charge/cross-border treatment, invoice sequencing, company tax status, and lawful retention periods are **unapproved TBD** and require UAE-qualified tax/finance review. Do not embed a guessed 5% rate or send invoices until this is verified. Refund and renewal terms remain DRAFT.

Subscriptions and accounts should survive provider outages without fictional paid upgrades. Immutable ledger events and reconciliation must not promote a subscription to ACTIVE without separately verified human/legal grant and transaction proof.

## 5. Customer onboarding — edition-specific, no patient use

**SaaS checklist**: identity and authorized contracting entity → executed SaaS MSA/order/DPA and residency/privacy agreement → independent security/legal and edition release authorization → verified tenant onboarding and RBAC → safely scoped center admin invitation → synthetic-only acceptance → provider sandbox billing/reconciliation → documented operational support/contact → customer authorization. Do not issue commercial welcome emails before consent and launch approval.

**Enterprise checklist**: verified customer/entity and signed Enterprise EULA/order → real signed edition installation OCI/bundle, exact approved SBOM and 44-version/91-asset redistribution and notices clearance → legal delivery receipt and installation/site/seat/env limits → customer infrastructure readiness → independent security/privacy/residency determination → backup/restore evidence → secure secret provisioning and OIDC → synthetic installation test and security acceptance → separate Enterprise grant. Do not package public repo as an unlicensed distributable build.

Keep customer IDs and legal records in access-controlled business systems. The public repo only holds redacted hashes and non-authorizing evidence status.

## 6. Enterprise deployment requirements

| Domain | Minimum qualification |
|---|---|
| Installation identity | Signed entitlement bound to legal customer, approved sites/seats/environments, version, immutable installation digest and expiry |
| Compute/deployment | Supported OS/architecture, pinned digest containers, immutable rollout strategy, non-root workloads, network and resource constraints |
| Data stack | PostgreSQL version and schema migration compatibility; Redis security and queue recovery; private S3-compatible storage and encryption |
| Identity/security | Tenant- and center-scoped OIDC/RBAC, TLS, hardware-backed secret handling as applicable, key rotation, private service accounts, audit integrity |
| Compliance | Verified local hosting/residency for applicable child and health data, third-party supplier/AI terms, independent privacy/legal approval |
| Operations | Observability, alerts, backups, tested restores, RPO/RTO commitments only when measured, disaster-recovery rehearsal, patch/EOL support |
| Delivery | Independently authenticated signed OCI/bundle and matching filesystem/runtime SBOM; required third-party notices, source offers, install proof and customer receipt |
| Exit | Data export, legally required retention, contract closeout, revocation and secure decommissioning without disabling safety access |

Disconnected/offline validation: verified issuer signatures and pinned customer/install scope, bounded expiration/grace with rollback/clock-skew protections, replay prevention, emergency authorized export read path, no offline bypass of role/tenant or clinical gates. Online recovery and license rotation must be auditable and safe under network partition and concurrent renewals.

## 7. Post-freeze implementation sequence (gated work, not currently performed)

1. **Feature-freeze evidence:** immutable V1 commit/tag, completed scope and owner acceptance, signed freeze approval, security/privacy/legal prerequisites; no self-declaration based on CI. Continue M5–M11 scope and owner acceptance independently.
2. **Migration/design review:** separate Prisma commercial models with tenant-scoped FK uniqueness and append-only audit, additive/backward-compatible migrations, no center status repurposing. Dry-run and rollback on synthetic database, verified data preservation.
3. **Read-only evaluation:** entitlement decision engine in shadow mode with safe audit only, negative-path tenant and role tests, zero mutations or billing.
4. **Non-clinical enforcement:** guarded post-freeze flag, mandatory auth/RBAC before plan checks, expiry/grace and clock/network failure tests, all safety and lawful export paths bypass billing ONLY after independent authorization.
5. **Billing sandbox:** provider signatures, idempotency/replay/out-of-order/refund/chargeback tests; finance/tax/legal signoff. No real charges or outbound mail without signed grant.
6. **SaaS onboarding:** verified contracting/consent/edition release, synthetic pilot, operator runbook and rollback; no real patient clinical operation while G2/G2b NO-GO.
7. **Enterprise release:** signed binary/image, independent SBOM and rights scan, installer entitlement, customer infrastructure validation, tested backups/restore, revocation/renewal, customer handover.
8. **Release readiness:** independent Codex review and full CI; performance and security tests; signed owner/finance/counsel per-edition approval; separate clinical G2/G2b permission for actual patient or signing work. Remain fail-closed until each is genuinely obtained.

**No automatic migration or activation should occur by merging this specification.**

## 8. Qualification matrix (implementation acceptance)

- Cross-tenant and cross-center reads/writes blocked even when an entitlement says ACTIVE; revoked memberships stay revoked.
- Unknown/stale/wrongly signed payments and webhook replays never update subscription state; duplicate ids have exactly-once effect.
- No invoice, renewal, grace period, tier price, quota or overage invented before finance policy approval.
- Expired/trial/suspended or offline customer can still perform authorized export, audit, necessary safety and privacy workflows; disallowed paid new actions remain gated after launch approval.
- No trial-expiry cron/job runs against V1; never toggle center clinical/safeguarding state from a billing event.
- Enterprise offline signer rotation, replay/clock skew/rollback, invalid scope and fingerprint mismatch fail-safe and auditable.
- Signed exact-release image and package/license/asset rights evidence reconciled independently; no self-issued certificate passes.
- Backup restore and safe rollback verified; no live patient data until separate G2/G2b approval.
- Regression matrices: 3 plans × 7 subscription states × 2 editions (invalid combinations rejected); 7 roles × 2 tenants × active/revoked membership; expiry/grace and network partition; tenant data retention/export; billing provider retries/failed payments; web 320/390/768/1024/1440 responsive UX + real assistive-tech acceptance.
- Keep original full CI checks and smart policy fail-closed, SBOM, secret scan, M4 sustained preview resource gate and Codex review. Document evidence in Rule 7 handover and close COM-05/06 only after actual post-freeze implementation and owner signoff.

## 9. External decisions to obtain

The following are intentionally NOT settled here: actual V1 freeze date, pricing and included quotas/overages, legal entity and original IP, legally enforceable license, selected billing processor, tax treatment, subscription grace, contract SLA/support commitments, health/child data residency and supplier permissions, signed production SaaS/Enterprise image evidence, real patient clinical G2/G2b approval. Their absence **blocks runtime commercial activation**, not continued synthetic feature work.
