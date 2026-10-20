# Test Credentials

Policy (owner correction R2): this file is Git-tracked, so it NEVER contains passwords, tokens, reset links or secrets.

Current state: no sign-in exists yet (TB-EM-001 checkpoint A is not authorized). There are no accounts.

When checkpoint A lands:
- Synthetic accounts (`@therabridge.test`) get random, disposable passwords on every `seed:synthetic` run.
- Passwords are written ONLY to `/app/.workspace/local-credentials/synthetic-accounts.json` (gitignored, mode 0600). Read them from there.
- The real owner account is never created in the Emergent preview.
