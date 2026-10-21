# Test Credentials

Policy (owner correction R2): this file is Git-tracked, so it NEVER contains passwords, tokens, reset links or secrets.

Synthetic accounts are created by `yarn workspace @therabridge/api seed:synthetic`. Each run issues new random passwords and revokes the accounts' sessions.
Passwords are written ONLY to `/app/.workspace/local-credentials/synthetic-accounts.json` (gitignored, mode 0600). Read them from there.

| Email | Role / scope |
|---|---|
| platform.ops@therabridge.test | PLATFORM_ADMIN (synthetic) |
| admin@harbor.therabridge.test | CENTER_ADMIN, Harbor Child Development Center |
| admin@cedar.therabridge.test | CENTER_ADMIN, Cedar Grove Therapy Collective |
| coordinator@harbor.therabridge.test | COORDINATOR, Harbor |
| leila.hassan@harbor.therabridge.test | THERAPIST, Harbor |
| supervisor@harbor.therabridge.test | CLINICAL_SUPERVISOR, Harbor (center summary + own profile) |
| multi@therabridge.test | THERAPIST at Harbor + CENTER_ADMIN at Cedar (must choose a workspace) |
| sara.morgan@family.therabridge.test | GUARDIAN, Harbor (no permissions yet) |
| norole@harbor.therabridge.test | Harbor membership with no role (no access) |
| suspended@harbor.therabridge.test | Suspended Harbor membership (no access) |

The real owner account is never created in the Emergent preview. It is created only through `bootstrap:owner`, which refuses to run in preview, CI and shared-synthetic environments.

Invitation links (TB-EM-003/004) are written only to `/app/apps/api/.outbox/*.json` (gitignored, mode 0600). Accounts created by accepting an invitation choose their own password at activation.
