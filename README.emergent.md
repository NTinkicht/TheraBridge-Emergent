## Technical evidence

The exact **source branch** `review/tb-em-011-least-privilege-safeguards` at `cd5f721d9e4d68f756baa4109628c44f217c706a` passed 442/442 API tests, API/web builds, secret scanning, Docker build/start/smoke on both GitHub Actions runs [39652806343](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39652806343) and [39652813269](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39652813269).

The **integration branch must receive its own complete CI verification before any merge**. This is not the source branch's CI and is not a clinical validation result.

- [Qualification and controlled-import checklist](docs/integration/TB-EM-011-QUALIFICATION.md)
- [TB-EM-011 development handoff](docs/emergent/workunits/TB-EM-011.md)
- [Evidence and screenshots](artifacts/tb-em-011/VALIDATION.md)
- [Run locally](docs/emergent/operations/RUN_LOCAL.md)

Private canonical specifications remain in `NTinkicht/TheraBridge/specs`, **not included in this public code repository**. Their D1, D4, D7, D-NEW-3, D-NEW-5, OR-15 and OR-16 decisions are unsigned. No clinical approval, recipient access or real-patient use may be inferred from this draft.

This file describes technical implementation status, not approved medical services.
