import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPacket} from './build-com01-counsel-packet.mjs';
const root=new URL('../../',import.meta.url);
const inputs={
 rights:readFileSync(new URL('docs/commercial/ip-rights-evidence-register.md',root),'utf8'),
 contracts:readFileSync(new URL('docs/commercial/contracts/CONTRACT_PACK_DRAFT.md',root),'utf8'),
 notice:readFileSync(new URL('docs/commercial/proposed-proprietary-notice.md',root),'utf8'),
 launch:readFileSync(new URL('docs/commercial/com05-entitlement-design.json',root),'utf8')
};
test('crosswalk reconciles existing eight rights scopes, nine draft contract sections, and eleven unresolved decisions',()=>{
 const p=buildPacket(inputs);
 assert.deepEqual(p.counts,{scopeCategories:8,contractSections:9,legalDecisionsOutstanding:11,legalDecisionsApproved:0});
 assert.equal(p.commercialLicenseGranted,false);
 assert.equal(p.clinicalG2Approved,false);
 assert.equal(p.clinicalG2bApproved,false);
 assert.equal(p.sourcePublicationDoesNotGrantLicense,true);
 assert.ok(p.scopeCategories.every(x=>x.status==='UNRESOLVED'));
 assert.ok(p.decisions.every(x=>x.status==='UNRESOLVED'&&!x.humanSignoffVerified));
});
test('missing ownership category or duplicated entry is rejected',()=>{
 const r=inputs.rights.split('\n');
 const row=r.find(x=>x.includes('TheraBridge-Emergent Git commit contributions'));
 assert.ok(row);
 assert.throws(()=>buildPacket({...inputs,rights:inputs.rights.replace(row,'')}),/COM01_REQUIRED_RIGHTS_SCOPE/);
 assert.throws(()=>buildPacket({...inputs,rights:inputs.rights+'\n'+row}),/COM01_REQUIRED_RIGHTS_SCOPE/);
});
test('forged counsel clearance in an OPEN rights register fails closed',()=>{
 const r=inputs.rights.replace(/(\| TheraBridge-Emergent Git commit contributions \|[^\n]*\| )OPEN( \|)/,'$1VERIFIED$2');
 assert.notEqual(r,inputs.rights);
 assert.throws(()=>buildPacket({...inputs,rights:r}),/COM01_UNVERIFIED_SCOPE/);
});
test('missing or duplicated SaaS or Enterprise contract sections fail closed',()=>{
 const line=inputs.contracts.split('\n').find(x=>x.startsWith('## C. Enterprise Deployment License Schedule'));
 assert.ok(line);
 assert.throws(()=>buildPacket({...inputs,contracts:inputs.contracts.replace(line,'')}),/CONTRACT_SECTION/);
 assert.throws(()=>buildPacket({...inputs,contracts:inputs.contracts+'\n'+line}),/CONTRACT_SECTION/);
});
test('Codex P2: approved contract disclaimer or manipulated matrix cannot pass',()=>{
 const signed=inputs.contracts.replace(
  '**PUBLIC WORKING DRAFT — NOT A SIGNABLE AGREEMENT, OFFER, COPYRIGHT LICENSE OR PRODUCTION AUTHORIZATION.**',
  '**APPROVED SIGNABLE AGREEMENT FOR CUSTOMERS.**'
 );
 assert.notEqual(signed,inputs.contracts);
 assert.throws(()=>buildPacket({...inputs,contracts:signed}),/COM01_SOURCE_STATUS_NOT_FAIL_CLOSED/);
 const cleared=inputs.contracts.replace(
  '| Rights-holder, academic/student/partner contributions | Restricted COM-01 register #312 | OPEN |',
  '| Rights-holder, academic/student/partner contributions | Restricted COM-01 register #312 | APPROVED |'
 );
 assert.notEqual(cleared,inputs.contracts);
 assert.throws(()=>buildPacket({...inputs,contracts:cleared}),/COM01_CONTRACT_APPROVAL_MATRIX_NOT_BLOCKED/);
 const clinical=inputs.contracts.replace(
  '| G2/G2b and clinical/consent/safeguarding/AI release approval | Independent clinical governance | NO-GO |',
  '| G2/G2b and clinical/consent/safeguarding/AI release approval | Independent clinical governance | GO |'
 );
 assert.notEqual(clinical,inputs.contracts);
 assert.throws(()=>buildPacket({...inputs,contracts:clinical}),/COM01_CONTRACT_APPROVAL_MATRIX_NOT_BLOCKED/);
});
test('adopted proprietary notice is not accepted as a mere proposal',()=>{
 const notice=inputs.notice.replace('NOT ADOPTED','ADOPTED');
 assert.throws(()=>buildPacket({...inputs,notice}),/COM01_SOURCE_STATUS/);
});
test('launch policy must still prohibit commercial license and G2/G2b',()=>{
 assert.throws(()=>buildPacket({...inputs,launch:'{}'}),/COM01_CANNOT_CORROBORATE/);
 assert.throws(()=>buildPacket({...inputs,launch:''}),/COM01_INVALID_SOURCE/);
 const forged=JSON.parse(inputs.launch);
 forged.commercialLicenseGranted=true; // Keyword-based scans would miss this.
 assert.throws(()=>buildPacket({...inputs,launch:JSON.stringify(forged)}),/COM01_CANNOT_CORROBORATE/);
 forged.commercialLicenseGranted=false;
 forged.invariants.g2NoGo=false;
 assert.throws(()=>buildPacket({...inputs,launch:JSON.stringify(forged)}),/COM01_CANNOT_CORROBORATE/);
});
test('report does not copy names, contributor identifiers, contract text, private records or signatures',()=>{
 const p=buildPacket(inputs);
 const out=JSON.stringify(p);
 assert.ok(!out.includes('TheraBridge-Emergent Git commit contributions'));
 assert.ok(!out.includes('Copyright ©'));
 assert.equal(p.contractingEntityVerified,false);
 assert.equal(p.legalNoticeAdopted,false);
 assert.ok(Object.keys(p.sourceSha256).length===4);
});
