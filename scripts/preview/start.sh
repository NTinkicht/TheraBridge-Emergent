#!/usr/bin/env bash
set -Eeo pipefail

# Render-only, synthetic-only entrypoint. No real clinical activation.
if [[ "$DEPLOYMENT_ENV" != "preview" ||
      "$DEMO_SEED_CONFIRM" != "CHILDRENS_HOME_SYNTHETIC_ONLY" ||
      -z "$DEMO_PASSWORDS_JSON" ||
      -z "$DATABASE_URL" ||
      -z "$AUTH_SECRET" ]]; then
  echo "ERROR: Missing explicit synthetic-preview configuration" >&2
  exit 1
fi
if [[ "$COOKIE_SECURE" != "true" || "$FAMILY_MESSAGING_DEMO" == "true" ]]; then
  echo "ERROR: Preview requires secure cookies and disabled family messaging" >&2
  exit 1
fi
if [[ "$API_UPSTREAM_ORIGIN" != "http://127.0.0.1:8001" ]]; then
  echo "ERROR: Preview API upstream must be private loopback, not a public proxy" >&2
  exit 1
fi

# Render assigns this value at runtime. Never use a browser-controlled Host
# or X-Forwarded-Host header to construct CORS or API destinations.
host="$RENDER_EXTERNAL_HOSTNAME"
if [[ ! "$host" =~ ^[A-Za-z0-9.-]+\.onrender\.com$ || "$host" == *..* ]]; then
  echo "ERROR: Expected the Render-assigned onrender.com external hostname" >&2
  exit 1
fi
origin="https://$host"
export CORS_ORIGINS="$origin"
export TRUSTED_PROXY_CIDRS=""
export DEV_MAILBOX_ENABLED=false
export ENABLE_FEASIBILITY_DIAGNOSTICS=false
export FAMILY_MESSAGING_DEMO=false
export FAMILY_PRACTICE_DEMO=true

# Keep Prisma as the single migration authority. Fail if database or
# credential mapping is wrong; never silently repair unrelated tenants.
yarn workspace @therabridge/api prisma migrate deploy
yarn workspace @therabridge/api seed:demo

api_pid=""
web_pid=""
cleanup() {
  [[ -z "$web_pid" ]] || kill "$web_pid" 2>/dev/null || true
  [[ -z "$api_pid" ]] || kill "$api_pid" 2>/dev/null || true
  [[ -z "$web_pid" ]] || wait "$web_pid" 2>/dev/null || true
  [[ -z "$api_pid" ]] || wait "$api_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

PORT=8001 HOST=127.0.0.1 node --max-old-space-size=192 apps/api/dist/main.js &
api_pid="$!"
node - <<'NODE'
async function ready() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch('http://127.0.0.1:8001/api/health');
      if (r.ok) {
        const h = await r.json();
        if (h.database?.status === 'up' && h.migrations?.applied >= 16) return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Preview API did not pass database and migration health checks');
}
ready().catch(e => { console.error(e.message); process.exit(1); });
NODE

# Only Next.js receives public traffic. Nest is bound to 127.0.0.1:8001.
node --max-old-space-size=192 node_modules/next/dist/bin/next start apps/web -H 0.0.0.0 -p "$PORT" &
web_pid="$!"
wait -n "$api_pid" "$web_pid"
echo "ERROR: Synthetic preview process exited unexpectedly" >&2
exit 1
