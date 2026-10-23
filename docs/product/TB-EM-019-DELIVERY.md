# TB-EM-019 — Child 360 and evidence assistance

Owner-directed synthetic-only development. Issue #64; draft PR #65.

## Integrated Slice A
- Child clinical workspace starts with an authorized, read-only Child 360 overview; uses the existing therapist/supervisor specialty-scoped workspace. It is not a family release.
- Progress can group recorded values weekly or monthly, per exact planVersionId + goalKey. Periods show count, range, arithmetic mean and last recorded value; no interpolated clinical trends.
- Report editor offers deterministic evidence text with references. A clinician must explicitly append it to their own editable report, and existing backend autosave/version checks apply. This is NOT AI-generated content.
- Home-plan editor presents centre-library templates matching a selected service. A clinician explicitly adds a candidate and must save the draft. Suitability, frequency and safety require human judgement.
- No external AI provider, real patient data, clinical interpretation or approval, signing, release, family messaging or production/pilot activation.

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
