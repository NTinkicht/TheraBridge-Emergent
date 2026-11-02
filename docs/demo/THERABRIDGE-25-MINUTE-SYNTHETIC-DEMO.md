# TheraBridge — 25-minute stakeholder demonstration (synthetic only)

**Target:** Children's Home Rehabilitation Center. **Duration:** 25 minutes, plus 5 minutes for questions if available. **Environment:** https://therabridge-ahmed-synthetic-demo.onrender.com. All names, dates, assessments, progress and appointments are fictional.

## Roster and narrative

- Centre: Children's Home Centre, Sharjah; Speech, Occupational Therapy and ABA.
- Children (six total): Yusuf Ahmed (existing), Amina Ahmed, Zayd Ahmed, Leen Al Mansouri, Faris Khalil, Maya Saleh. **Amina and Zayd are siblings**, linked to the same synthetic guardian account as Yusuf. Family relationships here are fictional.
- Original specialists: Layla Faris (Speech), Omar Nasser (OT); supervisor Dr. Hana Saleh.
- New individually authenticated synthetic team entries: Dalia Mansour (ABA), Nour Haddad (OT), Huda Rahim (Speech). Their separate high-entropy passwords are managed in `DEMO_EXTRA_PASSWORDS_JSON`; the original seven protected accounts and their passwords remain unchanged.
- Five new upcoming synthetic appointments, one per added child; no historical therapy outcomes are inferred for them.

## Presenter sequence (25 min)

| Time | Presenter | Action and narrative |
|---|---|---|
| 0:00–2:00 | Intro | Explain family–centre–therapist collaboration, fictional data, and demonstration limitations. |
| 2:00–6:00 | Centre admin | Open centre setup, show Speech/OT/ABA specialties and the expanded clinical team (5 therapists plus supervisor). Discuss specialty and tenant isolation. |
| 6:00–10:00 | Centre admin | Open Children; show six fictional children. Highlight Amina and Zayd as siblings under the same guardian, plus one existing Ahmed child. Open but cancel registration. |
| 10:00–13:00 | Coordinator | Open Schedule, switch day/week, navigate dates, locate new future appointments and demonstrate booking dialog open/cancel (no submission). |
| 13:00–19:00 | Speech therapist | Open assigned fictional child and Child 360°, then Therapy plan, Assessments, Sessions, Progress and Reports tabs. Show source-traced draft-oriented features without saving or signing. |
| 19:00–22:00 | Guardian | Show family activities, home practice, and clearly marked *Sample only* progress. Explain that unreleased clinical documents are not shared. |
| 22:00–25:00 | AI and controls | Explain offline deterministic suggestion scaffolding, clinician review and evidence provenance; show actual banner that live AI/media capture is disabled. Summarize governance NO-GO and request feedback. |

## Safe speaking prompts

- “We now have six completely fictional children and a multidisciplinary roster across Speech, OT and ABA.”
- “The two new siblings illustrate how a family can have multiple child profiles while clinical records remain per-child and specialty-scoped.”
- “A therapist sees assigned children, plans and session drafts. Nothing demonstrated here counts as a signed clinical record.”
- “This family progress screen is explicitly a sample. It is not a release of a real child's report.”
- “The architecture supports traceable, review-required suggestions. Live generative AI and real transcription are switched off pending approvals.”

## Operator checklist

1. Verify Render deploy is live, `/api/health` reports OK, and 24+ migrations apply.
2. Verify seed counts: 6 children; 10 protected sign-ins, including 3 extra therapist accounts; 15 demo appointments; no unexpected external users. Repeat seed and verify no duplicate counts.
3. Perform private hosted seven-role login/navigation smoke test plus three distinct therapist login/context/logout checks; do not expose secret JSON or screenshots of private data.
4. Rehearse transitions between administrator, coordinator, therapist and guardian. Logout between roles.
5. Never press Save, Submit, Sign, Publish, Release, Consent, Generate, or record real audio. Protected clinical and AI cases remain BLOCKED.

## Deployment and evidence

The seed changes are guarded by `DEPLOYMENT_ENV`, `DEMO_SEED_CONFIRM`, synthetic database name, existing transaction/collision checks, and unchanged seven-hosted-account secret policy. The additional three logins use a separately provisioned `DEMO_EXTRA_PASSWORDS_JSON` secret on Render and `TB_HOSTED_QA_EXTRA_USERS_JSON` in protected GitHub Actions; never include actual credentials in this document. Only deploy after PR CI and independent review qualify. The 104-case acceptance baseline and clinical/AI NO-GO remain unchanged.
