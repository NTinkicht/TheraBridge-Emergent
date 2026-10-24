# TB-EM-025 — Hosted read-only QA evidence runner

Supports the existing issue #61. **Do not reset the baseline**: 104 cases = 53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED, with four additional supplemental PASS. This proposal does not deploy the merged PR #72, change the Render demo, or modify clinical data.

Scripts:
- scripts/qa/hosted-readonly.mjs: fixed-host Playwright runner against the owner's synthetic demo, seven authorized role sessions, five Chromium viewport widths 320/390/768/1024/1440, private screenshots and redacted JSON evidence.
- scripts/qa/hosted-readonly.test.mjs: offline fail-closed contract tests without credentials or network.

Run offline: node --test scripts/qa/hosted-readonly.test.mjs

Run hosted (only on an authorized, network-capable browser with privately injected fictional accounts):
1. yarn install --frozen-lockfile && yarn playwright install chromium
2. Create a JSON file OUTSIDE the repo (chmod 600). Keys: platform, admin, coordinator, speech, ot, supervisor, guardian. Each value: {"email":"fictional synthetic email","password":"private synthetic password"}.
3. Independently verify the active Render LIVE deployment SHA, then set QA_USERS_FILE to that private file, QA_DEPLOY_SHA to that SHA, and execute: node scripts/qa/hosted-readonly.mjs

Output is under ~/.local/share/therabridge-private-qa, restricted to the runner user. Do not upload screenshots, secret files, browser storage, HARs, cookie/CSRF values, or raw headers to a public issue or PR.

N-052..N-086: checks role-specific major pages, real viewport, overflow/clipping, redirects, primary navigation and preliminary focus, with private screenshot hashes. A passing geometry probe alone never marks the entire role-width case PASS: dialog and visual/accessibility review remain required. Confirmed clipping causes FAIL, unavailable browser/credentials BLOCKED.

N-087..N-093: evaluates browser session-cookie attributes AND login Set-Cookie header attributes in memory: __Host prefix, Secure, HttpOnly, SameSite=Lax, Path=/, no Domain, host scope. Cookie values are never written.

The report's deployment SHA is metadata, not independently verified. Do not promote results into issue #61 until the deployed build and evidence are confirmed. Isolated tenant, restricted clinical runtime, error/retry and remaining N-094..N-104 checks are NOT implemented here. Real STT, AI, signing, consent, report release, safeguarding, messaging and pilot/production remain disabled.