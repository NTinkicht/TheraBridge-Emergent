# EXIT_FROM_EMERGENT

## Vendor dependencies (TB-EM-000)

| Concern | Inside Emergent | Outside Emergent | Takeover blocker? |
|---|---|---|---|
| Web server | Next.js dev via `frontend/package.json` shim | `apps/web` (Dockerfile / `yarn dev:web`) | No |
| API server | NestJS behind `backend/server.py` proxy (ADR-0005) | NestJS binds :8001 directly | No |
| Database | Workspace PostgreSQL 15 (ADR-0004), synthetic data | Any PostgreSQL 15/16; Compose provides 16 | No |
| Secrets | `apps/api/.env`, `apps/web/.env.local` (gitignored, not exported) | Owner vault → env vars per `RUN_LOCAL.md` | No |
| Email, storage, AI, payments | None used | n/a | No |
| Hosting | Preview URL only (no Emergent deploy for this stack) | Any container host | No |

Data export: not needed (synthetic only, schema is in Prisma migrations).

## Exporting from Emergent safely

1. Save to GitHub → repository `NTinkicht/TheraBridge-Emergent` → **Create new branch** `emergent/phase-1-center-foundation`.
2. **Never choose Force Push.** A new branch cannot modify `main`.
3. Verify on GitHub that `main` has the same SHA as before the export.

## Merging into existing history

The export may have **unrelated history** (this job was not imported from the repo). Integrate outside Emergent via a reviewed PR:

```bash
git fetch origin
git checkout -b integrate/phase-1 origin/main
git merge --allow-unrelated-histories --no-commit origin/emergent/phase-1-center-foundation
# Keep canonical files: restore any collision from main
git checkout origin/main -- README.md AGENTS.md 2>/dev/null || true
# Drop Emergent template/platform files
git rm -r --cached --ignore-unmatch backend frontend memory plan tests test_reports test_result.md .emergent
git status        # review every remaining path; all generated content is under apps/, assets/, scripts/, docs/emergent/
git commit -m "Integrate TB-EM-000 from Emergent"
git push origin integrate/phase-1   # open PR, require CI green
```

Files known to collide or be Emergent-only: root `README.md` (template), `backend/`, `frontend/`, `memory/`, `plan/`, `tests/`, `test_reports/`, `test_result.md`, `.emergent/`, root `.gitignore` (merge by hand).

## Continuing in a new Emergent job

Import the branch into a fresh Emergent job, then:
```bash
cd /app && yarn install --frozen-lockfile
cp apps/api/.env.example apps/api/.env   # set PORT=8002 HOST=127.0.0.1 and workspace credentials
cp apps/web/.env.example apps/web/.env.local   # set to the job's preview URL
```
Re-apply the shims if the new job's template replaced them (`backend/server.py`, `frontend/package.json` start script), then `sudo supervisorctl restart backend frontend`.
