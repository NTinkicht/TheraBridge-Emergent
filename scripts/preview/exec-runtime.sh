#!/usr/bin/env bash
set -Eeuo pipefail
# Defense in depth: server processes never inherit the privileged migration URL.
unset MIGRATION_DATABASE_URL
exec "$@"
