#!/bin/bash
# Run ONLY with the isolated disposable CI image, never the operator custody root.
set -Eeuo pipefail
umask 077
[[ "$(id -u)" = 1000 ]]
cd /repo
mkdir /tmp/tb-clam-fixture
# A harmless local signature for a unique synthetic marker; NOT a substitute
# for official signature databases, and never copied into the operator runtime.
node --input-type=module <<'JS'
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const bytes=Buffer.from('THERABRIDGE_SYNTHETIC_SCANNER_TEST_ONLY_'.repeat(4));
writeFileSync('/tmp/tb-clam-fixture/smoke.hdb',
  createHash('md5').update(bytes).digest('hex')+':'+bytes.length+':TheraBridge.Synthetic.Test\n');
JS
cat >/run/clamav/smoke.conf <<'CONFIG'
Foreground yes
LocalSocket /run/clamav/smoke.sock
LocalSocketMode 0600
DatabaseDirectory /tmp/tb-clam-fixture
TemporaryDirectory /run/clamav
StreamMaxLength 16M
MaxFileSize 16M
MaxScanSize 32M
MaxThreads 2
Bytecode no
CONFIG
clamd --config-file=/run/clamav/smoke.conf >/dev/null 2>&1 &
scanner=$!
trap 'kill "$scanner" 2>/dev/null || true; wait "$scanner" 2>/dev/null || true' EXIT
for ((i=0; i<45; i++)); do
  kill -0 "$scanner" 2>/dev/null
  [[ -S /run/clamav/smoke.sock ]] && break
  sleep 1
done
[[ -S /run/clamav/smoke.sock ]]
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createLocalClamdScanner} from './scripts/qa/m5-wu2c-private-custody.mjs';
const scanner=createLocalClamdScanner('/run/clamav/smoke.sock');
const clean=Buffer.from('clean fictional non-image scanner fixture '.repeat(4));
const marker=Buffer.from('THERABRIDGE_SYNTHETIC_SCANNER_TEST_ONLY_'.repeat(4));
const result=await scanner(clean);
assert.equal(result.verdict,'CLEAN');
assert.equal(result.sha256,createHash('sha256').update(clean).digest('hex'));
assert.equal(result.scannedBytes,clean.length);
assert.equal(result.engine,'ClamAV');
await assert.rejects(scanner(marker));
await assert.rejects(createLocalClamdScanner('/run/clamav/missing.sock')(clean));
console.log('PASS real ClamAV engine: clean fixture, synthetic signature rejection, missing socket denial; official DB and private artwork NOT tested.');
JS
