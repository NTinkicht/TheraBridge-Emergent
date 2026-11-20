// M5-12/16: exercise the real catalogue module in instrumented Jest/Istanbul.
// Standalone node:test coverage is not included in the mandatory Web numerator.
let mod;
beforeAll(async () => { mod = await import('../src/lib/illustrated-catalogue.mjs'); });
const activity = (patch = {}) => ({
  id:'a', title:'Équilibre blocks', specialty:'OT', category:'Movement',
  skill:'Balance', materials:['Foam'], equipment:['Blocks'],
  safety:['Adult supervises'], steps:['Stand carefully','Step over blocks'],
  approved:true, imageUrl:'https://unapproved.invalid/child.jpg', ...patch,
});
const ids=(rows,filter)=>mod.filterCatalogueActivities(rows,filter).map(x=>x.id);

describe('real source catalogue admission, input validation and private-media denial',()=>{
 test('projects immutable text and numbered instructions; ignores forged media publication',()=>{
  const src=activity(), item=mod.projectCatalogueActivity(src);
  expect(item.id).toBe('a');
  expect(item.steps.map(s=>s.number)).toEqual([1,2]);
  expect(item.illustration).toEqual({
   state:mod.CATALOGUE_MEDIA_STATE,src:null,alt:null,
   styleVersion:mod.ILLUSTRATION_STYLE_VERSION,
  });
  src.steps[0]='mutated';src.materials.push('injected');
  expect(item.steps[0].instruction).toBe('Stand carefully');
  expect(item.materials).toEqual(['Foam']);
  expect(Object.isFrozen(item)).toBe(true);
  expect(Object.isFrozen(item.steps[0])).toBe(true);
  expect('imageUrl' in item).toBe(false);
  expect('approved' in item).toBe(false);
 });
 test.each([null,undefined,false,0,'',[],42])('rejects nonrecord %p',v=>{
  expect(mod.projectCatalogueActivity(v)).toBeNull();
 });
 test.each([
  {id:''},{id:'   '},{id:'x'.repeat(129)},
  {title:''},{title:' '},{title:'t'.repeat(251)},
  {id:17},{title:false},{title:[]},{id:[]},
 ])('rejects invalid identity',bad=>{
  expect(mod.projectCatalogueActivity(activity(bad))).toBeNull();
 });
 test('accepts bounded trimmed identities and ignores nonstring optional taxonomy',()=>{
  const x=mod.projectCatalogueActivity(activity({
   id:' '+ 'x'.repeat(128)+' ',title:' '+ 't'.repeat(250)+' ',
   specialty:null,category:false,skill:5,
   steps:['  ',' First ','',' Last '],materials:null,
   equipment:undefined,safety:[' ',' Adult checks fit '],
  }));
  expect(x.id).toHaveLength(128);
  expect(x.title).toHaveLength(250);
  expect([x.specialty,x.category,x.skill]).toEqual(['','','']);
  expect(x.steps.map(s=>s.instruction)).toEqual(['First','Last']);
  expect(x.materials).toEqual([]);
  expect(x.equipment).toEqual([]);
  expect(x.safety).toEqual(['Adult checks fit']);
 });
 test.each(['steps','materials','equipment','safety'])('rejects invalid %s list entries and oversize lists',key=>{
  expect(mod.projectCatalogueActivity(activity({[key]:['good',42]}))).toBeNull();
  expect(mod.projectCatalogueActivity(activity({[key]:Array(101).fill('good')}))).toBeNull();
 });
 test('sparse array entries preserve numbering and never execute overridden list methods',()=>{
  const sparse=Array(3);sparse[1]=' Only ';
  sparse.filter=()=>{throw Error('do not use custom filter')};
  sparse.map=()=>{throw Error('do not use custom map')};
  expect(mod.projectCatalogueActivity(activity({steps:sparse})).steps).toEqual([
   {number:1,instruction:'Only'},
  ]);
 });
 test('denies nested array accessors with zero invocations',()=>{
  let calls=0;
  for(const key of ['steps','materials','equipment','safety']){
   const values=['safe'];
   Object.defineProperty(values,0,{get(){calls++;throw Error('malicious')}});
   expect(mod.projectCatalogueActivity(activity({[key]:values}))).toBeNull();
  }
  expect(calls).toBe(0);
 });
 test('denies own and inherited accessors, descriptor exceptions, revoked proxies',()=>{
  let calls=0;
  const own=activity();
  Object.defineProperty(own,'title',{get(){calls++;throw Error('own')}});
  const inherited=Object.assign(Object.create({get title(){calls++;throw Error('inherited')}}),{id:'x'});
  const throwing=new Proxy(activity(),{getOwnPropertyDescriptor(){throw Error('trap')}});
  const revoked=Proxy.revocable(activity(),{});revoked.revoke();
  for(const record of [own,inherited,throwing,revoked.proxy])
   expect(mod.projectCatalogueActivity(record)).toBeNull();
  expect(calls).toBe(0);
 });
});
describe('real catalogue taxonomy filtering and denial isolation',()=>{
 const a=activity(),b=activity({id:'b',title:'Naming pictures',specialty:'SLT',
  category:'Communication',skill:'Naming',materials:['Pictures'],
  equipment:['Cards'],steps:['Name a picture'],safety:['Check comprehension']});
 const rows=[a,b];
 test('AND filters and accent insensitive queries across permitted text',()=>{
  expect(ids(rows)).toEqual(['a','b']);
  expect(ids(rows,{query:'equilibre'})).toEqual(['a']);
  expect(ids(rows,{specialty:'ot'})).toEqual(['a']);
  expect(ids(rows,{category:'communication'})).toEqual(['b']);
  expect(ids(rows,{skill:'naming'})).toEqual(['b']);
  expect(ids(rows,{equipment:'cards'})).toEqual(['b']);
  expect(ids(rows,{query:'foam'})).toEqual(['a']);
  expect(ids(rows,{query:'blocks'})).toEqual(['a']);
  expect(ids(rows,{query:'name a picture'})).toEqual(['b']);
  expect(ids(rows,{query:'slt'})).toEqual(['b']);
  expect(ids(rows,{query:'movement'})).toEqual(['a']);
  expect(ids(rows,{query:'balance'})).toEqual(['a']);
  expect(ids(rows,{query:'missing'})).toEqual([]);
  expect(ids(rows,{specialty:'SLT',skill:'balance'})).toEqual([]);
  expect(ids(rows,{category:'Movement',specialty:'OT',skill:'Balance',equipment:'Blocks'})).toEqual(['a']);
  expect(ids(rows,{query:'ÉQUILIBRE',specialty:'SLT'})).toEqual([]);
  expect(ids(rows,{equipment:'unknown'})).toEqual([]);
  expect(ids(rows,{skill:'unknown'})).toEqual([]);
 });
 test('absent or nonstring filters are optional and cannot execute coercion',()=>{
  expect(ids(rows,{query:5,specialty:null,category:false,skill:{},equipment:[]})).toEqual(['a','b']);
 });
 test('malicious array entries cannot hide valid later records',()=>{
  let called=0;
  const bad=activity({id:'bad'});
  Object.defineProperty(bad.steps,0,{get(){called++;throw Error('nested')}});
  const list=[a,bad,b];
  Object.defineProperty(list,1,{get(){called++;throw Error('index')}});
  expect(ids(list,{query:'blocks'})).toEqual(['a']);
  expect(ids(list,{specialty:'SLT'})).toEqual(['b']);
  expect(called).toBe(0);
 });
 test('invalid containers deny all rather than leaking entries',()=>{
  expect(ids(null)).toEqual([]);
  expect(ids({length:1,0:a})).toEqual([]);
  expect(ids(Array(10001))).toEqual([]);
  const trapped=new Proxy(rows,{getOwnPropertyDescriptor(){throw Error('trap')}});
  expect(ids(trapped)).toEqual([]);
  const revoked=Proxy.revocable(rows,{});revoked.revoke();
  expect(ids(revoked.proxy)).toEqual([]);
 });
 test('accessor-backed filters cannot execute side effects',()=>{
  let called=0;
  for(const key of ['query','specialty','category','skill','equipment']){
   const filter={};
   Object.defineProperty(filter,key,{get(){called++;throw Error('filter getter')}});
   expect(ids(rows,filter)).toEqual([]);
  }
  expect(called).toBe(0);
 });
 test('invalid record does not obstruct authorized sibling',()=>{
  const poisoned=new Proxy(activity(),{getOwnPropertyDescriptor(){throw Error('denied')}});
  expect(ids([poisoned,b])).toEqual(['b']);
  expect(Object.isFrozen(mod.filterCatalogueActivities(rows))).toBe(true);
 });
});
describe('real print projection protects unapproved illustrations',()=>{
 test('numbered accessible labels and immutable independent material/safety snapshots',()=>{
  const source=activity(),printed=mod.projectPrintableActivity(source);
  expect(printed.status).toBe('SYNTHETIC_PREVIEW_NOT_APPROVED_FOR_RELEASE');
  expect(printed.instructions.items.map(x=>x.accessibleLabel)).toEqual([
   'Step 1: Stand carefully','Step 2: Step over blocks',
  ]);
  expect(printed.materials).toEqual({heading:'Materials',items:['Foam']});
  expect(printed.equipment).toEqual({heading:'Equipment',items:['Blocks']});
  expect(printed.safety).toEqual({heading:'Safety',items:['Adult supervises']});
  expect(printed.illustration).toEqual({state:mod.CATALOGUE_MEDIA_STATE,src:null});
  expect(JSON.stringify(printed)).not.toMatch(/https:\/\/|imageUrl|publicationStatus/);
  source.steps[0]='tampered';
  expect(printed.instructions.items[0].instruction).toBe('Stand carefully');
  expect(Object.isFrozen(printed.instructions.items[0])).toBe(true);
  expect(Object.isFrozen(printed.instructions.items)).toBe(true);
  expect(Object.isFrozen(printed)).toBe(true);
 });
 test('invalid, empty, missing or malicious instructions cannot print',()=>{
  expect(mod.projectPrintableActivity(null)).toBeNull();
  expect(mod.projectPrintableActivity(activity({steps:[]}))).toBeNull();
  expect(mod.projectPrintableActivity(activity({steps:undefined}))).toBeNull();
  expect(mod.projectPrintableActivity(activity({steps:[' ','']}))).toBeNull();
  expect(mod.projectPrintableActivity(activity({steps:[false]}))).toBeNull();
  const bad=activity();
  Object.defineProperty(bad.steps,'0',{get(){throw Error('blocked')}});
  expect(mod.projectPrintableActivity(bad)).toBeNull();
 });
});
