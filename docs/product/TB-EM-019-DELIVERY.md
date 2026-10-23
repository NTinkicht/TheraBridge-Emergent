# TB-EM-019 — Child 360 and evidence assistance

Owner-directed synthetic-only development. Issue #64; draft PR #65.

## Integrated Slice A
- Child clinical workspace starts with an authorized, read-only Child 360 overview; uses the existing therapist/supervisor specialty-scoped workspace. It is not a family release.
- Progress can group recorded values weekly or monthly, per exact planVersionId + goalKey. Periods show count, range, arithmetic mean and last recorded value; no interpolated clinical trends.
- Report editor offers deterministic evidence text with references. A clinician must explicitly append it to their own editable report, and existing backend autosave/version checks apply. This is NOT AI-generated content.
- Home-plan editor presents centre-library templates matching a selected service. A clinician explicitly adds a candidate and must save the draft. Suitability, frequency and safety require human judgement.
- No external AI provider, real patient data, clinical interpretation or approval, signing, release, family messaging or production/pilot activation.

## Slice A2 — evidence provenance added
- Report evidence now includes the exact persisted observation IDs and linked session IDs for authorized clinical users (additive optional fields, no schema migration). Sources remain scoped by the existing clinical permissions and precise plan-version/goal selection.
- Clinicians can expand recorded evidence to see source IDs in the report sidebar and weekly/monthly progress tables.
- The deterministic report draft assistant includes source observation IDs in its review panel, plus tests for API provenance and source lists.
- This does not create a signed source-to-sentence acceptance ledger, disclose draft data to guardians, or activate any external AI.

## Slice A3 — scoped named care team (new commit)
- Clinical workspace includes a read-only `careTeam` for currently active, assigned therapist memberships, with verified names, exact therapy specialty, and the persisted `CareAssignment.isLead` flag. No data model or migration changes.
- Assigned therapists only see names assigned within their own service scope; clinical supervisors see all authorized services for that centre and child. Centre admins, coordinators, parents, and unassigned therapists cannot enter the clinical workspace.
- Suspended or revoked memberships, inactive users, missing therapist role, ended assignments and removed member specialties are filtered. All queries remain centre/child scoped.
- Child-wide referent explicitly displays **Not designated** because the current schema does not record that appointment. A specialty lead is never silently elevated to that separate role.
- API negative regression tests cover speech vs OT, unassigned roles, guardian/admin denials, supervisor messaging denial, membership suspension and assignment/specialty revocation. Child 360 renders care-team cards responsively within existing design tokens.

## Slice A3 — explicit goal-linked activity draft foundation
- HomeActivity JSON optionally stores `goalKey`, whose version is always its **containing** PlanVersion (no second, conflicting version ID). The API checks linked goal keys belong to the same submitted version.
- The existing plan editor lets clinicians choose the exact goal for each activity. Newly added items cannot be saved without selecting a goal; older legacy activities remain unlinked and editable until clinicians choose to associate them. No assignment is inferred automatically.
- Invalid goal keys are rejected with 422 before version mutation. Tests cover rejection/no-write and a successful persisted link. No database migration, clinical approval, parent release or external AI.
- Full immutable template snapshots, per-activity provenance/audit, historical report connection and clinician accept/edit/omit remain later Slice B tasks.

## Slice A4 — immutable home activity template contents
- New activity assignments in editable plan drafts capture a server-generated template snapshot (title, specialty, age band, duration, steps, materials, safety, version, capture timestamp) stored in the containing PlanVersion JSON; client-supplied snapshots are never trusted.
- Subsequent edits to the same draft preserve the original assignment's captured snapshot, even after library changes; new plan versions inherit frozen assignment snapshots. No new database migration or new clinical permissions.
- Draft validation rejects duplicates and cross-specialty templates within the centre. The read-only internal family preview displays the already-captured snapshot for new records, not current mutable library content. Old unsnapshotted drafts keep the prior fallback.
- This is immutable *content capture per assignment*, not yet a signed medical order or a separate immutable audit ledger; report and practice release stay locked.

## Slice A5 — explicit evidence-assistance review controls
- An editable evidence suggestion now requires an explicit clinician action: **edit and append** or **omit** (with restore). The UI prevents duplicate insertion of the same evidence source block and respects version-save conflicts.
- Appending a passage includes its factual source references in the existing report section, which is persisted ONLY via the existing versioned autosave and retains the normal conflict/retry behavior.
- Clinician choices in this slice are UI-local; only inserted report text persists. The application does NOT claim to have a separate immutable accept/omit audit log or clinical approval.
- End-to-end browser regression tests omit/restore/edit/append, source references and ordinary report autosave on a disposable synthetic test database.

## Slice A6 — separate historical plan-version progress
- Auth-scoped Child 360 progress now offers an explicit **read-only previous plan versions** view with individual goal charts, weekly/monthly recorded measurements, sample counts and observation-source IDs.
- It never joins measurements for identical goal keys between different versions, never interpolates values, and does not expose an historical goal in the new observation writer.
- Added source-level regression for archived/versioned goals; no new server data exposure or real clinical interpretation.

## Slice A7 — deny-by-default AI provider seam
- Added a typed clinical provider interface for future report/home-plan suggestions and an always-denying default implementation registered with Nest DI. The public application routes do not expose AI generation.
- There is **no** model SDK, HTTP transport, external provider key, upload path or environment-variable activation mechanism. Even a hypothetical `CLINICAL_AI_ENABLED=true` cannot turn the provider on.
- Unit regression verifies that both generation operations are forbidden and capability metadata reports no external processing. Future provider implementations require a new owner-approved change and independent review.

## Slice A8 — responsive browser regression
- The CI seven-role Playwright journey explicitly resizes its own Chromium viewport to **320, 390, 768, 1024 and 1440 px**, checking the authenticated Child 360° overview and care-team cards for page overflow and clipping.
- This is a deterministic geometry test, not a replacement for visual inspection of every screen, contrast, touch targets, Safari or Firefox.

## Slice A9 — therapist-only non-clinical family practice summary
- Child 360° displays recent synthetic home-practice outcome statuses using the **existing** permission-checked `clinical/practice-feedback` endpoint; no new server access grants or guardian discussion routes.
- Only therapists can see the panel. Both request scope and UI filter restrict results to that child and currently authorized specialties. No guardian name, relationship or free-text family messages are rendered. Practice outcomes remain separate from clinical progress measurements.
- The CI browser journey checks that the panel renders. External Work QA and wider permissions testing are still pending.

## Slice B — Post-increment residual work and review gate

The main synthetic-only acceptance slice is implemented and qualified through `b6a15de2854a45691753d477ed0040b9cc17cac6` (hosted six-job CI success). **Review and owner decision are next**; do not start another writer branch or duplicate PR. Read `docs/product/TB-EM-019-REVIEW-PACKET.md`.

Explicit residual or policy-gated work, *not* claimed complete:
1. Persistent clinician audit/attestation of suggestion accept/omit choices and formal source-to-sentence traceability/contradiction analysis.
2. Explicit child-wide referent record; current named specialty leads are separate and child referent reads `Not designated`.
3. Full Child 360 report-review state and broader longitudinal UX refinements, plus cross-browser/physical-mobile and human visual/accessibility inspection.
4. True generative AI only under separately approved D7/D-NEW-5, provider security, data residency, retention and cost gates.
5. Live Render/Neon external browser verification **after** independent review and owner-authorized merge/deployment; current PR is unmerged.

## Tests
- scripts/design/check-child360-logic.mjs executes pure TypeScript browser helper source in Node, testing exact plan version, same-name goals in different versions, week/month boundary, source IDs and factual-only assistance.
- scripts/design/check-demo-journey.mjs logs in as seven roles against a real synthetic backend. It now visits Child 360, monthly progress, home-plan suggestions and report text suggestions as the Speech therapist.
- Existing clinical/session permission and concurrency regressions remain required to pass.

## Safety
The hosted Render+Neon demo is NOT updated by this PR. Current external Work QA applies only to the previously merged baseline. This draft has no independent Mistral finding and must not be deployed before owner approval.
