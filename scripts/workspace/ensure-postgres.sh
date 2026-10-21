#!/usr/bin/env bash
# Emergent workspace only (ADR-0004). Installs PostgreSQL if missing, runs it from a persistent data dir under
# .workspace/, and creates the role + dev/test databases named in apps/api/.env. Not used by Docker/CI.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO/apps/api/.env"
PGDATA="$REPO/.workspace/pgdata"
LOG="$REPO/.workspace/postgres.log"

if ! ls /usr/lib/postgresql/*/bin/pg_ctl >/dev/null 2>&1; then
  echo "[ensure-postgres] installing PostgreSQL from Debian packages"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql >/dev/null
fi
BIN="$(dirname "$(ls /usr/lib/postgresql/*/bin/pg_ctl | sort -V | tail -1)")"

# Stop the distro default cluster so it never competes for the port.
if command -v pg_lsclusters >/dev/null; then
  pg_lsclusters -h 2>/dev/null | awk '$4=="online"{print $1, $2}' | while read -r ver name; do
    pg_ctlcluster "$ver" "$name" stop || true
  done
fi

read_url() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'; }
parse() { python3 -c "import sys,urllib.parse as u;p=u.urlparse(sys.argv[1]);print(getattr(p,sys.argv[2]) if sys.argv[2]!='db' else p.path.lstrip('/'))" "$1" "$2"; }
DEV_URL="$(read_url DATABASE_URL)"
TEST_URL="$(read_url DATABASE_URL_TEST)"
PG_USER="$(parse "$DEV_URL" username)"
PG_PASS="$(python3 -c "import sys,urllib.parse as u;print(u.unquote(u.urlparse(sys.argv[1]).password))" "$DEV_URL")"
PG_PORT="$(parse "$DEV_URL" port)"
DEV_DB="$(parse "$DEV_URL" db)"
TEST_DB="$(parse "$TEST_URL" db)"

mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
touch "$LOG" && chown postgres:postgres "$LOG"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  su postgres -s /bin/bash -c "$BIN/initdb -D '$PGDATA' -U postgres -E UTF8 --auth-local=trust --auth-host=scram-sha-256" >/dev/null
fi

if ! su postgres -s /bin/bash -c "$BIN/pg_ctl -D '$PGDATA' status" >/dev/null 2>&1; then
  setsid su postgres -s /bin/bash -c "$BIN/pg_ctl -D '$PGDATA' -l '$LOG' -w -t 60 -o \"-p $PG_PORT -k /tmp -c listen_addresses=127.0.0.1\" start" >/dev/null
fi

psql_su() { su postgres -s /bin/bash -c "psql -h /tmp -p $PG_PORT -U postgres -v ON_ERROR_STOP=1 -tAc \"$1\""; }
if [ "$(psql_su "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'")" != "1" ]; then
  psql_su "CREATE ROLE $PG_USER LOGIN CREATEDB PASSWORD '$PG_PASS'"
fi
for db in "$DEV_DB" "$TEST_DB"; do
  if [ "$(psql_su "SELECT 1 FROM pg_database WHERE datname='$db'")" != "1" ]; then
    psql_su "CREATE DATABASE $db OWNER $PG_USER"
  fi
done
echo "[ensure-postgres] PostgreSQL $("$BIN/postgres" --version | awk '{print $3}') ready on 127.0.0.1:$PG_PORT ($DEV_DB, $TEST_DB)"
