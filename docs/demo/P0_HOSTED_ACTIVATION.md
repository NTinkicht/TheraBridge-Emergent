# P0 hosted activation — Children's Home / Ahmed family demo

**Only fictional data.** This is not a clinical pilot, production deployment, approval, consent, or release. Issue #61 remains open until an actual external-browser demo passes.

## Resources

- App source: NTinkicht/TheraBridge-Emergent, main
- Provisioned Neon project: TheraBridge Synthetic Demo Preview, ID aged-fog-03608251; database therabridge_demo_preview, PostgreSQL 16, Frankfurt (Germany)
- Render proposal: render.yaml, ONE Free web service in Frankfurt, auto-deploy off. Next is public on port 10000; the Nest API listens **only** at 127.0.0.1:8001 inside the container. The Next rewrite points to loopback for same-origin browser access.
- Dockerfile.preview and scripts/preview/start.sh validate synthetic-only configuration, apply the original Prisma migrations, seed the Ahmed family with operator-managed credentials and start both processes. No manual migration SQL.
- scripts/preview/check-external.mjs tests the actual HTTPS site from a real Chromium browser across all seven fictional roles.

The Render integration explicitly requires owner confirmation of the intended workspace. No service or paid resource is automatically created when this file is committed. A Free web service can sleep/restart, cannot use persistent disks, and has limited memory. Do not upgrade to a paid plan without owner approval.

## Secure Render setup

1. Confirm the Render workspace. Import render.yaml as a Blueprint from the reviewed main branch.
2. In Neon, obtain a connection URL for project aged-fog-03608251, database therabridge_demo_preview. Store it in the Render protected environment variable named DATABASE_URL. Do not put its contents in code, GitHub comments, workflow inputs, screenshots or public logs. Use SSL verification as supported by the provider.
3. Generate seven distinct strong fictional account passwords by running the following command from a trusted local checkout:

    node scripts/preview/generate-secrets.mjs

   It writes .workspace/local-credentials/render-demo-passwords.json with owner-only permissions, never prints secrets, and refuses to overwrite. Copy the entire JSON object into Render protected environment variable DEMO_PASSWORDS_JSON. Keep a secure private copy; seven login identities are listed in docs/demo/DEMO_GUIDE.md.
4. Render generates a 256-bit AUTH_SECRET. Do not reuse the fictional account passwords as the session secret.
5. Keep DEPLOYMENT_ENV=preview; COOKIE_SECURE=true; DEMO_SEED_CONFIRM=CHILDRENS_HOME_SYNTHETIC_ONLY; FAMILY_MESSAGING_DEMO=false; FAMILY_PRACTICE_DEMO=true. The startup script derives the allowed HTTPS origin from Render's own assigned hostname; never trust a browser Host header for this.
6. Deploy the **synthetic** service only. Its startup fails if any required configuration is absent, database name is not explicitly demo, any unrelated tenant/user exists, or the configured account passwords differ from existing hashes. It does not silently rotate or reset credentials.

The first successful boot: Prisma deploys all existing migrations, creates one centre/family/child, seven role accounts, 10 appointments, eight completed but unsigned sessions, two draft plans/reports, 16 dated fictional measurements, and activity samples. Subsequent restarts run idempotent validation, not duplicate records. The demo trial remains subject to actual trial expiry; reseeding does not extend it.

## Real external verification

From an authorized local or trusted CI runner, with Chromium installed and the protected DEMO_PASSWORDS_JSON loaded:

    DEMO_PREVIEW_URL=https://therabridge-ahmed-synthetic-demo.onrender.com node scripts/preview/check-external.mjs

The script accepts this ONE explicitly configured hostname to prevent accidental disclosure of passwords to another host. It checks root/login, same-origin API and 16 migrations, hidden diagnostics, platform/centre/coordinator/therapist/supervisor/parent roles, Speech vs OT isolation, denied clinical and parent message access, family sample-only practice and logout. It is read-only other than login/logout.

Capture redacted proof of these checks, the final approved preview URL, and hosting health before closing issue #61. **A successful local CI demo or a provisioned Neon database alone does not satisfy the external preview P0.**

## Limitations and safety

- The Free Render service may be memory-constrained for two Node processes; measure health and inspect authorized logs, and seek permission before a paid upgrade.
- The previous style.dev HTTP 403 is a hosting access-control gate that this code does not bypass. This creates an independent, owner-controlled preview rather than manipulating that gate.
- No real patient data, clinical signing, consent grants, report release, real audio/STT, external AI, safeguarding escalation, clinical pilot or production use is permitted.
- If the Render hostname is different, independently validate and update the external checker allowlist before giving it any credentials.
