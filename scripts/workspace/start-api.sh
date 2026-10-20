#!/usr/bin/env bash
# Emergent workspace only (ADR-0005). Started by backend/server.py; brings up PostgreSQL, applies migrations, runs NestJS in watch mode.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bash "$REPO/scripts/workspace/ensure-postgres.sh"
cd "$REPO"
[ -d node_modules/@nestjs/core ] || yarn install --frozen-lockfile
cd apps/api
yarn -s prisma generate
yarn -s prisma migrate deploy
exec yarn -s start:dev
