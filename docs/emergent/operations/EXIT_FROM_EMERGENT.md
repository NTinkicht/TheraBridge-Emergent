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

The actual export branch is `phase-1-center-foundation` (first SHA `b86028e`).

1. Save to GitHub → `NTinkicht/TheraBridge-Emergent` → existing branch `phase-1-center-foundation`. New local commits sit on top of `b86028e`, so this is a fast-forward.
2. **Never choose Force Push.** If a conflict or Force Push prompt appears, cancel and save to a new branch (`phase-1-center-foundation-fixN`). Exporting to a branch other than `main` cannot modify `main`.
3. Verify on GitHub: `main` has the same SHA as before; the branch contains `yarn.lock` and all three `.env.example` files. Emergent's auto-commit has dropped these before.

## Merging into existing history

**Confirmed:** `phase-1-center-foundation` has **no common ancestor** with `main`. Do not merge it, and do not use `--allow-unrelated-histories`, because that would pull in the Emergent template history and its files. Instead, copy an allow-list of paths onto a branch made from `main`:

```bash
git clone git@github.com:NTinkicht/TheraBridge-Emergent.git && cd TheraBridge-Emergent
bash <(git show origin/phase-1-center-foundation:scripts/integration/import-emergent-export.sh) phase-1-center-foundation integrate/tb-em-000
# review: git diff --cached --stat ; git diff --cached
git commit -m "Import TB-EM-000 from Emergent export <sha>"
git push -u origin integrate/tb-em-000      # normal push of a NEW branch
# open PR integrate/tb-em-000 -> main, require CI green, squash-merge
```

What the script guarantees (tested against a simulated repo, see TEST_RESULTS C5):
- It branches from `origin/main`, so the existing documentation and history are kept as they are.
- It copies only: `apps assets scripts docs/emergent .github/workflows/ci.yml docker-compose.yml .dockerignore .nvmrc .env.example package.json yarn.lock README.emergent.md`.
- It never copies: `README.md` (template), `backend/`, `frontend/`, `memory/`, `plan/`, `tests/`, `test_reports/`, `test_result.md`, `.emergent/`.
- It aborts without changing anything if an allow-listed path is missing from the export, or if a file exists in `main` with different content.
- It prints the `.gitignore` lines `main` lacks, so you can merge them by hand. It never pushes.

Later exports: re-run the script on a fresh branch from `main`. Its diff then shows only that work unit's changes.

## Continuing in a new Emergent job

Import the branch into a fresh Emergent job, then:
```bash
cd /app && yarn install --frozen-lockfile
cp apps/api/.env.example apps/api/.env   # set PORT=8002 HOST=127.0.0.1 and workspace credentials
cp apps/web/.env.example apps/web/.env.local   # set to the job's preview URL
```
Re-apply the shims if the new job's template replaced them (`backend/server.py`, `frontend/package.json` start script), then `sudo supervisorctl restart backend frontend`.
