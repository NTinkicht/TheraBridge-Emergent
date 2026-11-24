#!/bin/bash
set -Eeuo pipefail
umask 077
die(){ printf '%s\n' 'Private artwork custody preflight failed. No publication enabled.' >&2; exit 1; }
[[ "$(id -u)" = 1000 && "$#" = 1 ]] || die
[[ "${1}" = stage || "${1}" = verify-staged || "${1}" = verify ]] || die
# No HTTP server, no cloud SDK, no inbound port or remote scanner.
# Real input is mounted read-only; secrets are supplied only at runtime.
pack=/private/input
state=/private/state
evidence=/private/evidence/provider-evidence.json
journal="$state/m5-artwork-intake.jsonl"
root="$state/custody"
case "$1" in
 verify) exec node scripts/qa/m5-pr-a-artwork-pack.mjs verify "$pack";;
 verify-staged)
   [[ -n "${TB_PRIVATE_DATA_KEY_B64:-}" ]] || die
   exec node scripts/qa/m5-pr-a-artwork-pack.mjs verify-staged "$pack" "$root" "$journal";;
esac
[[ -n "${TB_PRIVATE_DATA_KEY_B64:-}" && -n "${TB_ARTWORK_OPERATOR_ID:-}" ]] || die
[[ -d "$state" && ! -L "$state" && "$(stat -c %a "$state")" = 700 && -w "$state" ]] || die
[[ -f "$evidence" && ! -L "$evidence" && -r "$evidence" ]] || die
[[ ! -e "$journal" && ! -L "$journal" ]] || die
# Signatures must be installed on the authorized host, updated independently
# and mounted read-only. Do not download them during a custody run.
for base in main daily bytecode; do
  [[ -s "/var/lib/clamav/$base.cvd" || -s "/var/lib/clamav/$base.cld" ]] || die
done
# A stale daily signature file is operationally denied; this is not an
# independent security review or proof of trusted host clock.
find /var/lib/clamav -maxdepth 1 -type f \( -name daily.cvd -o -name daily.cld \) -mmin -2880 -print -quit | grep -q . || die
export TB_MEDIA_CLAMD_SOCKET=/run/clamav/clamd.sock
cat > /run/clamav/clamd.conf <<'CONFIG'
Foreground yes
LocalSocket /run/clamav/clamd.sock
LocalSocketMode 0600
DatabaseDirectory /var/lib/clamav
TemporaryDirectory /run/clamav
StreamMaxLength 16M
MaxFileSize 16M
MaxScanSize 32M
MaxThreads 2
CONFIG
clamd --config-file=/run/clamav/clamd.conf >/dev/null 2>&1 &
scanner=$!
trap 'kill "$scanner" 2>/dev/null || true; wait "$scanner" 2>/dev/null || true' EXIT
for ((i=0; i<120; i++)); do
  kill -0 "$scanner" 2>/dev/null || die
  [[ -S "$TB_MEDIA_CLAMD_SOCKET" ]] && break
  sleep 1
done
[[ -S "$TB_MEDIA_CLAMD_SOCKET" ]] || die
# Real scanner PING / VERSION / INSTREAM checks in stagePrivateIllustrationOnHost.
node scripts/qa/m5-pr-a-artwork-pack.mjs stage "$pack" "$root" "$evidence" "$TB_ARTWORK_OPERATOR_ID" "$journal"
node scripts/qa/m5-pr-a-artwork-pack.mjs verify-staged "$pack" "$root" "$journal"
