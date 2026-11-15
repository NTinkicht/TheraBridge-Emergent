#!/usr/bin/env node
// COM-01: non-sensitive evidence intake for legal counsel.
// A public repository can check document completeness, never ownership or signatures.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const sha=x=>createHash('sha256').update(x).digest('hex');
const requiredScopes=[
 ['SOURCE_CONTRIBUTIONS','TheraBridge-Emergent Git commit contributions'],
 ['PRIVATE_SPECIFICATIONS','Private specifications repository'],
 ['ACADEMIC_STUDENTS','Student / academic project components'],
 ['PARTNER_MATERIALS','Partner-related materials'],
 ['ORIGINAL_BRAND','Original logo and derivatives'],
 ['GENERATED_MEDIA','Generated catalogue illustrations and UI assets'],
 ['THIRD_PARTY_DEPENDENCIES','Software dependencies and container images'],
 ['MODEL_DATA_SERVICES','AI model, hosted service and training/data inputs']
];
const contractSections=[
 ['MSA','## A. Master Services Agreement'],
 ['SAAS','## B. SaaS Subscription Schedule'],
 ['ENTERPRISE','## C. Enterprise Deployment License Schedule'],
 ['DPA','## D. Data Processing Addendum'],
 ['SECURITY','## E. Security Schedule'],
 ['SLA_SUPPORT','## F. Service Level and Support Schedule'],
 ['ACCEPTABLE_USE','## G. Acceptable Use and Clinical Accountability Schedule'],
 ['ORDER_FORM','## H. Order Form'],
 ['APPROVAL_MATRIX','## I. Approval and traceability matrix']
];
const legalGates=[
 'RIGHTS_HOLDER_IDENTITY','SOURCE_CHAIN_OF_TITLE',
 'ACADEMIC_INSTITUTIONAL_PERMISSION','PARTNER_BRAND_PERMISSION',
 'THIRD_PARTY_SAAS_NETWORK_RIGHTS','THIRD_PARTY_ENTERPRISE_REDISTRIBUTION',
 'CONTRACTING_ENTITY_AND_SIGNATURE_AUTHORITY','UAE_COUNSEL_REVIEW',
 'CUSTOMER_DATA_PROCESSING_AND_RESIDENCY','ACTUAL_SAAS_RELEASE_DIGEST',
 'ACTUAL_ENTERPRISE_DELIVERABLE_DIGEST'
];
function buildPacket({rights,contracts,notice,launch}){
 for(const [name,body] of Object.entries({rights,contracts,notice,launch})){
  if(typeof body!=='string'||body.length===0||body.length>1024*1024)
   throw Error('COM01_INVALID_SOURCE_'+name.toUpperCase());
 }
 if(!rights.startsWith('# COM-01: intellectual-property rights evidence register')||
    !rights.includes('Status: NOT VERIFIED')||
    !contracts.startsWith('# TheraBridge — MSA and SaaS / Enterprise contracting pack')||
    !notice.includes('NOT ADOPTED'))
  throw Error('COM01_SOURCE_STATUS_NOT_FAIL_CLOSED');
 const rows=rights.split(/\r?\n/).filter(line=>line.startsWith('| '));
 const categories=requiredScopes.map(([id,label])=>{
   const matching=rows.filter(line=>line.split('|')[1]?.trim()===label);
   if(matching.length!==1)throw Error('COM01_REQUIRED_RIGHTS_SCOPE_MISSING_OR_DUPLICATED_'+id);
   const cells=matching[0].split('|').slice(1,-1).map(x=>x.trim());
   if(cells.length!==4||cells[2]!=='OPEN'||!cells[1]||!cells[3])
    throw Error('COM01_UNVERIFIED_SCOPE_MUST_REMAIN_OPEN_'+id);
   return {id,status:'UNRESOLVED',signedPermissionIndependentlyVerified:false,
    counselDecisionIndependentlyVerified:false,privateEvidenceReferenceRecorded:false};
 });
 const sections=contractSections.map(([id,prefix])=>{
   const matches=contracts.split(/\r?\n/).filter(line=>line.startsWith(prefix));
   if(matches.length!==1)throw Error('COM01_REQUIRED_CONTRACT_SECTION_MISSING_OR_DUPLICATED_'+id);
   return {id,present:true,approved:false};
 });
 const decisions=legalGates.map(id=>({id,status:'UNRESOLVED',
  evidenceReference:'NOT_PROVIDED',humanSignoffVerified:false}));
 if(!launch.includes('commercialLicenseGranted')||!launch.includes('false')||
    !launch.includes('G2_G2B_NO_GO')&&!launch.includes('g2NoGo'))
  throw Error('COM01_CANNOT_CORROBORATE_LAUNCH_SAFETY');
 return {
  schema:'therabridge-com01-counsel-evidence-intake-v1',
  status:'REVIEW_PACKET_ONLY_ALL_LEGAL_DECISIONS_OPEN',
  sourceSha256:{rights:sha(rights),contracts:sha(contracts),
   proposedNotice:sha(notice),entitlements:sha(launch)},
  counts:{scopeCategories:categories.length,contractSections:sections.length,
   legalDecisionsOutstanding:decisions.length,legalDecisionsApproved:0},
  scopeCategories:categories,contractSections:sections,decisions,
  contractingEntityVerified:false,ipOwnershipVerified:false,
  legalNoticeAdopted:false,thirdPartyRightsCleared:false,
  enterpriseRedistributionApproved:false,
  sourcePublicationDoesNotGrantLicense:true,
  commercialLicenseGranted:false,clinicalG2Approved:false,clinicalG2bApproved:false
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length!==5||new Set(args).size!==args.length)
   throw Error('USAGE: build-com01-counsel-packet.mjs rights.md contracts.md proposed-notice.md entitlement-design.json new-output.json');
  const [rights,contracts,notice,launch]=args.slice(0,4).map(p=>readFileSync(p,'utf8'));
  const report=buildPacket({rights,contracts,notice,launch});
  writeFileSync(args[4],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(err){console.error('COM01_COUNSEL_INTAKE_FAILED',err.message);process.exitCode=1;}
}
export {buildPacket,requiredScopes,contractSections,legalGates};
