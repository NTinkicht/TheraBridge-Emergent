#!/usr/bin/env node
// Generates an evidence-based license REVIEW QUEUE; never a legal approval or verified NOTICE.
// Usage: node scripts/commercial/classify-sbom.mjs <CycloneDX.json> <report.json> <notices-review.md>
import {readFileSync,writeFileSync} from 'node:fs';

const [input,reportPath,noticePath]=process.argv.slice(2);
if(!input||!reportPath||!noticePath||process.argv.length!==5) {
  console.error('Usage: classify-sbom.mjs input.cdx.json report.json notices-review.md');
  process.exit(2);
}
let bom;
try {bom=JSON.parse(readFileSync(input,'utf8'));}
catch { console.error('Missing or invalid SBOM');process.exit(1); }
if(bom.bomFormat!=='CycloneDX'||!Array.isArray(bom.components)||bom.components.length===0) {
 console.error('Input must contain non-empty CycloneDX components');process.exit(1);
}
const norm=x=>String(x??'').trim();
const highRisk=/(?:^|[^A-Z0-9])(?:AGPL|GPL|LGPL|SSPL|BUSL|BSL|EUPL|CC-BY-NC|CC-BY-ND|NONCOMMERCIAL|NO[- ]?COMMERCIAL|PROPRIETARY|UNLICENSED)(?:[^A-Z0-9]|$)/i;
const entries=[];
for(const c of bom.components) {
 if(!c||!norm(c.name)||!norm(c.type)) {
  console.error('SBOM contains component without name/version/type');process.exit(1);
 }
 const licenses=Array.isArray(c.licenses)?c.licenses:[];
 const candidates=[...new Set(licenses.flatMap(l=>{
  if(l?.license) return [norm(l.license.id||l.license.name)].filter(Boolean);
  if(l?.expression) return [norm(l.expression)].filter(Boolean);
  return [];
 }))].sort();
 const properties=Array.isArray(c.properties)?c.properties:[];
 const lockOnly=properties.some(p=>p?.name==='therabridge:provenance'&&
  norm(p.value).includes('yarn.lock-only'));
 const risk=candidates.some(l=>highRisk.test(l))?'RESTRICTIVE_REVIEW':
  candidates.length===0||!norm(c.version)?'UNKNOWN_REVIEW':'CANDIDATE_REVIEW';
 entries.push({
  name:c.name,version:norm(c.version)||'UNKNOWN',type:norm(c.type),identityStatus:norm(c.version)?'COMPLETE':'VERSION_MISSING',purl:norm(c.purl)||null,
  bomRef:norm(c['bom-ref'])||null,candidateLicenses:candidates,
  classification:risk,provenance:lockOnly?'LOCKFILE_ONLY':'SCANNER_DISCOVERED',
  approved:false,
  reviewRequired:true,
  rationale:lockOnly?'License and installation not independently verified; record came from lockfile':
    risk==='RESTRICTIVE_REVIEW'?'Potential redistribution, network, patent or other terms require legal review':
    risk==='UNKNOWN_REVIEW'?'No usable license/version declaration in CycloneDX metadata':
    'Scanner license metadata is a candidate, not verification of LICENSE/NOTICE text'
 });
}
entries.sort((a,b)=>a.name.localeCompare(b.name,'en')||
 a.version.localeCompare(b.version,'en')||
 a.type.localeCompare(b.type,'en')||
 (a.purl||'').localeCompare(b.purl||'','en'));
const summary={
 total:entries.length,restrictive:entries.filter(x=>x.classification==='RESTRICTIVE_REVIEW').length,
 unknown:entries.filter(x=>x.classification==='UNKNOWN_REVIEW').length,
 candidate:entries.filter(x=>x.classification==='CANDIDATE_REVIEW').length,
 lockfileOnly:entries.filter(x=>x.provenance==='LOCKFILE_ONLY').length,
 legallyApproved:0
};
if(summary.restrictive+summary.unknown+summary.candidate!==summary.total||
 entries.some(x=>x.approved!==false||x.reviewRequired!==true)){
 console.error('Unsafe approval classification');process.exit(1);
}
const report={schema:'therabridge-license-review-queue-v1',
 qualification:'UNVERIFIED SCANNER METADATA — NOT LEGAL APPROVAL OR RELEASE NOTICE',
 source:'CycloneDX SBOM; exact-workflow-commit artifact',
 summary,components:entries};
const md=[
 '# TheraBridge — THIRD-PARTY NOTICES REVIEW DRAFT',
 '',
 '**NOT APPROVED FOR CUSTOMER DISTRIBUTION.** This is a machine-generated *review queue*, not a verified legal notices file or a claim that the listed license texts are authentic.',
 '',
 'Validate each component against the actual published LICENSE and NOTICE texts, copyright holders, provenance, SaaS/network clauses and enterprise redistribution obligations. Do not publish this as a definitive THIRD_PARTY_NOTICES.md until reviewed.',
 '',
 'Summary: '+summary.total+' components; '+summary.restrictive+' potentially restrictive; '+summary.unknown+' unknown; '+summary.candidate+' other candidate licenses; '+summary.lockfileOnly+' lockfile-only; **0 approved**.',
 '',
 '| Component | Version | Candidate license(s) | Review class | Evidence |',
 '| --- | --- | --- | --- | --- |',
 ...entries.map(x=>'| '+[x.name,x.version,x.candidateLicenses.join(', ')||'UNKNOWN',x.classification,x.provenance].map(v=>String(v).replaceAll('|','\\|').replaceAll('\n',' ')).join(' | ')+' |'),
 '',
 'No copyright notices or full license texts are reproduced because the SBOM alone does not establish their contents.',
 ''
].join('\n');
try {
 // Output paths are fixed by CI to /tmp; never read these outputs back as trusted policy.
 writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 writeFileSync(noticePath,md,{flag:'wx'});
} catch { console.error('Could not exclusively write review artifacts');process.exit(1); }
console.log(JSON.stringify({status:'REVIEW_QUEUE_GENERATED',...summary}));
