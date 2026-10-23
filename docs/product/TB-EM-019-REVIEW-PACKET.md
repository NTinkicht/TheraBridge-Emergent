# TB-EM-019 — Mistral independent review packet

**Owner scope:** Child 360° + exact-version progress + clinician-controlled evidence-assisted reports/home-plan drafts, using a single fictional synthetic center/family. **No external AI activated.**

- Repository: `NTinkicht/TheraBridge-Emergent`
- PR: [#65](https://github.com/NTinkicht/TheraBridge-Emergent/pull/65) **OPEN/DRAFT**, base `main@b11b41daf9b69883d9ade1a325e32b65cf6090b8`.
- Qualified last implementation SHA: `b6a15de2854a45691753d477ed0040b9cc17cac6`.
- Exact-head CI evidence: [run 39999150532](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999150532), all six jobs SUCCESS. Duplicate [39999142438](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999142438) also SUCCESS.
- **Reviewer:** independently verify the PR's ACTUAL latest HEAD before issuing a verdict; this document may receive a later documentation-only commit. Do not assume the historical code SHA remains latest.

## Implemented (please inspect source, not only this summary)

1. **Child 360° / read authorization:** `ClinicalService.workspace`, `Child360.tsx`, `clinical.ts`. Child/specialty-assigned therapist read scope and supervisor review; no clinical access for centre admin, coordinator, guardian, or unassigned therapist. Named active therapists reflect current assignment and membership; specialty leads are `CareAssignment.isLead` and child-wide referent remains explicitly **Not designated**. Family practice panel is therapist-only via pre-existing `clinical/practice-feedback` API and does not display guardian identity/discussions or mix practice status into clinical progress.
2. **Progress:** `progress-analysis.ts`, `Panels.tsx`. Exact `planVersionId + goalKey` per series, ISO Monday–Sunday UTC/date-only buckets or calendar month, no interpolations; observed values with counts/means/source IDs and accessible table; historical plan versions strictly separate and read-only. Infer no clinical outcome from changes.
3. **Reports:** `reports.service.ts`, `ReportSide.tsx`, `evidence-assist.ts`, `ReportEditor.tsx`. Recorded observation IDs and sessions carried with source-referenced factual draft passages. Clinician manually edit/omit/restore/append; insertion flows through existing optimistic-version autosave. Local omit/append UI state is NOT a signed or persisted review-decision ledger, and factual text remains clinician editable.
4. **Home activities:** `ClinicalService.updateVersion`, `clinical.dto.ts`, `PlanEditor.tsx`. The therapist chooses an explicit goal key in the containing draft plan version; API rejects nonexistent goal keys and duplicate/cross-specialty templates. Server captures a **content snapshot** of activity title/service/age/duration/materials/steps/safety/version/time on first assignment and retains it across draft edits. Historic unlinked drafts still load. Only signed-off future policies could authorize parent release.
5. **AI boundary:** `apps/api/src/clinical/ai-provider.ts`, `clinical.module.ts`. Registered provider always rejects both report/home-plan generation regardless of env flag. No LLM SDK, outbound network or new API routes in this workstream.
6. **Tests:** `apps/api/test/clinical.e2e-spec.ts`, `progress-reports.e2e-spec.ts`, `clinical-ai-policy.e2e-spec.ts`, `scripts/design/check-child360-logic.mjs`, `check-demo-journey.mjs` and unchanged existing suites.

## Independent review questions (focus on potential blockers)

- Can a therapist see care-team names, evidence or home-practice outcomes from the wrong center, child, specialty or after assignment/membership revocation? Can admin, coordinator, guardian or supervisor access discussions?
- Can a request insert malicious/foreign templates, change `goalKey` to a different plan version, fabricate snapshot data, or cause old captured content to change after library edits?
- Are immutable plan snapshots actually immutable per version? Does `governance.capturePreview` bind frozen evidence and return `released:false` only? Do signing/approval/consent/release routes stay fail-closed?
- Are date-only weekly/monthly periods and original observations faithfully represented and version scoped? Does the chart/table ever mix superseded and active values?
- Can a user-facing report suggestion be applied while a version conflict exists, duplicated inadvertently, or misrepresented as clinical interpretation or AI-generated truth? Are evidence citations actually attached to the draft text?
- Does the deny-by-default AI seam have any activation bypass via environment variables/registration? Any data export/credential/network path?
- Does the new five-width Chromium test meaningfully constrain responsive clipping? What remains untested?

## Decision categories

Provide **NO_BLOCKING_FINDINGS / CHANGES_REQUIRED** with severities, exact file+line references, repro steps/tests, source evidence and precise SHA. Distinguish proven source checks, CI evidence, personally executed tests and unverified external claims. This is **READ-ONLY review**; never approve, merge, push, redeploy or open new PR. Review can recommend changes but cannot authorize clinical go-live.

## Remaining work / explicitly non-claims

- No real generative AI: D7/D-NEW-5 owner decisions, model provider, residency/retention/subprocessor governance still pending.
- No immutable accepted/omitted-suggestion audit ledger or source-to-sentence formal clinical attestation.
- No persisted child-wide referent designation; specialty leads are *not* that role.
- No complete cross-browser/physical-mobile/visual accessibility audit; only five-width geometry and existing Chromium synthetic browser tests.
- No live external HTTPS seven-role browser verification of this unmerged candidate. `docs/qa/TEST_RESULTS.md` holds exact CI and limitations.
- Clinical signing, consent grants, approval, report release, real STT/audio, safeguarding escalation, unrestricted family messaging, pilot and production all remain NO-GO.

Follow `AGENTS.md`, `docs/emergent/design/DESIGN_DIRECTION.md`, issue #64 and `docs/product/TB-EM-019-DELIVERY.md`.
