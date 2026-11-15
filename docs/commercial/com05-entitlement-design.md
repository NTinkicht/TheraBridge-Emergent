# COM-05 — Commercial editions and entitlement safety contract (draft)

**DRAFT / NOT ENABLED / NOT A PRICE LIST / NOT A CUSTOMER LICENSE OR CLINICAL AUTHORIZATION.**
Tracking: [#316](https://github.com/NTinkicht/TheraBridge-Emergent/issues/316), with release authority [#371](https://github.com/NTinkicht/TheraBridge-Emergent/issues/371), IP chain-of-title [#312](https://github.com/NTinkicht/TheraBridge-Emergent/issues/312), and contracts [#315](https://github.com/NTinkicht/TheraBridge-Emergent/issues/315).

## Scope and edition matrix

| Dimension | Starter | Professional | Enterprise |
| --- | --- | --- | --- |
| Delivery model | Hosted SaaS, subject to approval | Hosted SaaS, subject to approval | Dedicated or customer-managed, subject to approval |
| Seats / centers / children | TBD | TBD | Individually contracted, TBD |
| Storage / AI usage limits | TBD | TBD | Individually contracted, TBD |
| Pricing, VAT, renewal | TBD | TBD | TBD |
| Support, SLA and response windows | TBD | TBD | TBD |
| Redistribution rights | None inferred | None inferred | Requires separately verified customer deliverables and license rights |
| Clinical signing / consent / release | G2/G2b NO-GO | G2/G2b NO-GO | G2/G2b NO-GO |

**No default allowances or prices** have been authorized. A licensed subscription is never a clinical approval.

## Subscription states and transition design

Candidate states: `TRIAL`, `ACTIVE`, `GRACE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`. Their existence in this draft is **not** approval of an automatic transition policy. Financial administrators and counsel must agree on state-specific billing, renewal/cancellation, notice periods, trial eligibility and effective grace duration before any runtime design is activated.

Future entitlement reads must be keyed by a verified tenant, signed issuer/effective time and approved edition version; enforce server-side checks on every resource access, and never trust browser claims or an unscoped entitlement cache. Billing state and clinical authorization are separate independent inputs; an entitlement may restrict **new optional nonclinical paid features**, but cannot create a therapist role, permit a cross-tenant read, issue consent, override safeguarding, release protected material or enable real transcription/AI.

When subscriptions expire, are suspended, or the licensing provider becomes unavailable:
- Preserve lawful export, required historical records, immutable audit evidence, approved emergency/clinical continuity and required retention. **No automatic deletion, patient lockout or record modification from billing alone.**
- Do not grant new paid entitlements on license server failure; separately design bounded offline validation and restoration/DR semantics for Enterprise. No silent phone-home.
- Restriction/notice behavior, exact grace length and operator escalation are **UNDECIDED**. A policy failure must be auditable and must not weaken authorization or clinical gates.
- Billing may not alter report-signing, consent, co-signing, safeguarding or G2/G2b controls; authorized human governance remains independent.

## Candidate API contract — DESIGN ONLY

No endpoints or database migrations are implemented by this PR. Future review may consider a versioned tenant-scoped response:

```json
{
  "schema": "therabridge-entitlement-read-model-v1",
  "tenantId": "[authoritatively resolved tenant]",
  "edition": "STARTER | PROFESSIONAL | ENTERPRISE",
  "subscriptionState": "TRIAL | ACTIVE | GRACE | EXPIRED | SUSPENDED | CANCELLED",
  "policyVersion": "[approved immutable policy identifier]",
  "effectiveAt": "[trusted time]",
  "expiresAt": "[approved, bounded time or null]",
  "sourceSignatureVerified": false,
  "commercialAuthorization": false,
  "clinicalAuthorization": false,
  "limits": "[only from approved order form]"
}
```

This is explanatory pseudo-JSON; **do not consume, expose or activate** these placeholder claims. In the eventual implementation, signatures must be cryptographically authenticated from a preapproved issuer, and entitlement checks must not override authorization, role assignment, tenant scope, clinical consent or legal retention. Define API error codes and tenant-safe audit events only after security/privacy review.

## Threat model and later acceptance

Review spoofed cross-tenant subscriptions, replayed licenses, clock rollback, license issuer compromise, browser/local cache tampering, forged edition upgrades, simultaneous renewal and revocation, enterprise offline mode, broken payment provider, indefinite payment outage, and unexpected billing currency/amount changes. Use simulated tenants and synthetic data only.

Before enabling runtime: approved entity/IP rights, legal/counsel-reviewed SaaS/Enterprise agreements, verified third-party rights per actual release digest, signed order-specific edition policy, controlled issuer trust model, audit and disaster-recovery tests, and explicit independent clinical governance. No runtime policy or customer order defaults are approved by this documentation.

The machine-readable `com05-entitlement-design.json` is intentionally a zero-authorization design record. `verify-com05-policy.mjs` enforces that this draft cannot silently acquire paid quotas, activate billing, issue an enterprise license or weaken patient rights. Once business policy is explicitly approved, introduce a **separate authorization workflow and vetted schema** rather than changing this conservative draft to return `APPROVED`.

```bash
node --test scripts/commercial/verify-com05-policy.test.mjs
node scripts/commercial/verify-com05-policy.mjs docs/commercial/com05-entitlement-design.json
```
