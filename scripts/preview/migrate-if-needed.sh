#!/usr/bin/env bash
set -Eeo pipefail

# A read-only Prisma history comparison is the sole no-op migration authority.
# An already-current synthetic database must not acquire a session advisory lock
# from a pooled legacy connection (which can remain stranded in PgBouncer).
# For pending/diverged/failed/unreachable state, retain Prisma's ORIGINAL
# lock-protected migrate-deploy behavior; NEVER disable advisory locking.
if yarn workspace @therabridge/api prisma migrate status; then
  echo "Existing Prisma migration history is current; no deploy required"
else
  echo "Prisma migration status is not current; running lock-protected deploy"
  yarn workspace @therabridge/api prisma migrate deploy
fi
