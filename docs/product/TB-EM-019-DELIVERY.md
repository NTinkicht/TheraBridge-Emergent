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

## Slice B — FreeBuff continuation, SAME branch and PR
Continue feature/tb-em-019-child360-evidence-assist from the latest exact HEAD. Do not create another PR or redeploy the Render preview while external QA is paused.
1. Extend Child 360 to include permitted named care team/referent, authorized family-practice feedback and accessible cross-tab clinician timeline. Continue denying out-of-scope specialties and supervisor messaging.
2. Expand goal/version history and measured progress, exact source provenance, inadequate-data states, dated evidence chart/table alternatives and role/specialty negative tests.
3. Establish clinician-reviewed goal-to-activity associations: explicit chosen goal key tied to plan version, centre-local library template snapshot, frequency and safety notes, duplicate prevention, no automatic prescription.
4. Improve report draft source-to-sentence traceability and clinician accept/edit/omit workflow without automatic saving or publication.
5. Define a provider-neutral AI adapter behind disabled-by-default policy gates. No real model activation without approved D7/D-NEW-5 decisions, subprocessors, residency, retention, confidentiality and cost limits.
6. Test at 320/390/768/1024/1440 and include browser/API negative tests, migrations if genuinely required, handoff docs, full exact-head CI and independent Mistral review before owner-authorized merge.

## Tests
- scripts/design/check-child360-logic.mjs executes pure TypeScript browser helper source in Node, testing exact plan version, same-name goals in different versions, week/month boundary, source IDs and factual-only assistance.
- scripts/design/check-demo-journey.mjs logs in as seven roles against a real synthetic backend. It now visits Child 360, monthly progress, home-plan suggestions and report text suggestions as the Speech therapist.
- Existing clinical/session permission and concurrency regressions remain required to pass.

## Safety
The hosted Render+Neon demo is NOT updated by this PR. Current external Work QA applies only to the previously merged baseline. This draft has no independent Mistral finding and must not be deployed before owner approval.
