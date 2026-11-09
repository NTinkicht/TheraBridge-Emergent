#!/usr/bin/env node
// Validate a generated CycloneDX result; structural evidence, NOT license clearance.
import {readFileSync} from 'node:fs';
const file = process.argv[2];
const kind = process.argv[3] || 'source';
if (!file || !['source','image'].includes(kind)) {
  console.error('Usage: node scripts/commercial/check-sbom.mjs file.cdx.json source|image');
  process.exit(2);
}
let doc;
try { doc=JSON.parse(readFileSync(file,'utf8')); }
catch {console.error('SBOM missing or invalid JSON');process.exit(1);}
if (doc.bomFormat !== 'CycloneDX' ||
    !/^1\.[4-9]$/.test(String(doc.specVersion || '')) ||
    !Array.isArray(doc.components) || doc.components.length < 1) {
  console.error('CycloneDX format/components missing or unsupported');
  process.exit(1);
}
const valid=doc.components.filter(x=>x && typeof x.name==='string' && x.name &&
  typeof x.version==='string' && x.version && typeof x.type==='string');
if (valid.length===0) {console.error('SBOM has no versioned components');process.exit(1);}
if (kind==='source' && !valid.some(x=>String(x.purl||'').startsWith('pkg:npm/'))) {
  console.error('No npm components found; yarn.lock may not have been scanned');
  process.exit(1);
}
const output={result:'PASS',kind,components:doc.components.length,versioned:valid.length,
  npmComponents:valid.filter(x=>String(x.purl||'').startsWith('pkg:npm/')).length,
  limitation:'Scanner discovery only; asset rights and license compatibility unverified'};
console.log(JSON.stringify(output));
