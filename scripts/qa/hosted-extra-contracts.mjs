// M4-02 private hosted QA validation primitives: no secrets or child data exported.
export const EXTRA_IDENTITIES = Object.freeze({
  aba2: {email:'dalia.mansour@childrens-home.therabridge.test', specialty:'behavioral', children:['Amina Ahmed','Zayd Ahmed','Maya Saleh']},
  ot2: {email:'nour.haddad@childrens-home.therabridge.test', specialty:'occupational', children:['Zayd Ahmed']},
  speech2: {email:'huda.rahim@childrens-home.therabridge.test', specialty:'speech', children:['Amina Ahmed','Maya Saleh']},
});
// Seeded exclusivity among new therapists: use real child IDs from an authorized read,
// then prove another therapist gets a denial when fetching that child's clinical record.
// Names and UUIDs remain in process memory, never in the result artifact.
export const DENIED_PAIRS = Object.freeze({
  aba2:'Leen Al Mansouri', ot2:'Amina Ahmed', speech2:'Zayd Ahmed'
});
export const STATUSES = Object.freeze(['PASS','FAIL','BLOCKED']);
const err=()=>{throw new Error('private_extra_therapist_preflight_failed');};
export function validateExtraUsers(raw) {
  let obj;try {obj=JSON.parse(raw);}catch{err();}
  if (!obj || typeof obj!=='object' || Array.isArray(obj) ||
      JSON.stringify(Object.keys(obj).sort())!==JSON.stringify(Object.keys(EXTRA_IDENTITIES).sort())) err();
  const passwords=new Set(), emails=new Set();
  for(const [key,profile] of Object.entries(EXTRA_IDENTITIES)){
    const item=obj[key];
    if (!item || Object.keys(item).sort().join(',')!=='email,password' ||
      item.email!==profile.email ||
      typeof item.password!=='string' || item.password.length<24 || item.password.length>128 ||
      passwords.has(item.password) || emails.has(item.email)) err();
    passwords.add(item.password);emails.add(item.email);
  }
  return obj;
}
export function inspectTherapistContext(session,key) {
  const required=EXTRA_IDENTITIES[key];
  if(!required || session?.user?.email?.toLowerCase()!==required.email) return false;
  const options=session.contexts;
  return Array.isArray(options) && options.length===1 &&
    options[0]?.type==='center' && options[0].role==='THERAPIST' &&
    typeof options[0].centerId==='string' && /^[a-f0-9-]{36}$/i.test(options[0].centerId) &&
    typeof options[0].membershipId==='string' &&
    options[0].membershipId.length>0 &&
    (session.activeContext===null ||
      (session.activeContext?.role==='THERAPIST' &&
       session.activeContext?.membershipId===options[0].membershipId &&
       session.activeContext?.centerId===options[0].centerId));
}
export function inspectAssignedChildren(data,key) {
  const expected=EXTRA_IDENTITIES[key];
  if(!expected || !Array.isArray(data?.items))return false;
  if(data.items.length!==expected.children.length)return false;
  const names=data.items.map(c=>`${c.firstName} ${c.lastName}`);
  if(new Set(names).size!==names.length ||
     names.some(n=>!expected.children.includes(n)))return false;
  // Child-list team contains *other members*. It cannot prove the *actor's*
  // specialty. A successful scoped clinical workspace read is checked separately.
  return data.items.every(c=>typeof c.id==='string' && c.id.length>0);
}
export function inspectClinicalScope(workspace,key,childId) {
  const expected=EXTRA_IDENTITIES[key];
  // ClinicalService.workspace() filters child.services to the actor's active
  // assigned service(s), unlike ChildrenService.list()'s full care team.
  return !!expected && workspace?.child?.id===childId &&
    Array.isArray(workspace.child.services) &&
    workspace.child.services.length===1 &&
    workspace.child.services[0]===expected.specialty &&
    workspace.synthetic===true && typeof workspace.locked==='string' && workspace.locked.includes('disabled until');
}
export function safeResponseCode(status){
  if(status===401)return 'denied_unauthenticated';
  if(status===403)return 'denied_forbidden';
  if(status===404)return 'denied_not_found';
  if(status===200)return 'unexpected_success';
  return 'unexpected_status';
}
export function denied(status){
  // Do not claim a tenant/specialty isolation PASS when authentication vanished.
  return status===403||status===404;
}
export function safeResult(key,step,status,reason) {
  if(!Object.hasOwn(EXTRA_IDENTITIES,key) || !/^[a-z_]+$/.test(step) ||
    !STATUSES.includes(status) || !/^[a-z_]+$/.test(reason)) throw Error('invalid_safe_result');
  return {role:key,step,status,reason};
}
export function totals(rows){
  return Object.fromEntries(STATUSES.map(s=>[s,rows.filter(r=>r.status===s).length]));
}
