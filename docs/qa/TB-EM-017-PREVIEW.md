# TB-EM-017 — Preview entrypoint and API reachability

Draft PR for issue #61. It does **not** establish that the owner-gated external preview is reachable.

## Expected
- / redirects to /login without session cookie and /app with cookie. This is UI navigation only; all authorization remains API-enforced.
- /api/* rewrites to one fixed trusted server-side API_UPSTREAM_ORIGIN, never a caller-selected host. Browser auth/module fetches use relative paths.
- /dev/feasibility 404 unless ENABLE_FEASIBILITY_DIAGNOSTICS=true and DEPLOYMENT_ENV is local/ci/preview/shared-synthetic; disabled in Compose.
- Same-origin cookies, CSRF, Origin restrictions, tenant isolation and clinical restrictions stay intact.

## Environment
- Local web: copy apps/web/.env.example into apps/web/.env.local, using API_UPSTREAM_ORIGIN=http://127.0.0.1:8001.
- Docker Compose: root .env.example uses API_UPSTREAM_ORIGIN=http://api:8001; built and runtime web use this fixed internal service URL.
- Hosted preview: operator must start web, Nest API, PostgreSQL and apply migrations; configure API_UPSTREAM_ORIGIN as trusted **server-reachable** API host; configure exact external CORS_ORIGINS, secure cookies on HTTPS and conservative trusted proxies. Rebuild when changing upstream (Next rewrite compiled at build).
- Do not override hosting platform owner-access HTTP 403; owner must authorize the external preview via host settings.

## Coverage
- scripts/design/check-preview-entry.mjs checks root/login routing and metadata.
- Hosted CI Compose checks entry redirect, gated diagnostic 404, same-origin /api/health and hostile-Origin POST rejection.
- Real external *.style.dev login/role workflows remain **UNVERIFIED**, dependent on authorized host access.
- Synthetic only: no patient data, signing/release, genuine audio/STT, AI or production use.

Separate demo centre/family dataset is not part of this PR.
