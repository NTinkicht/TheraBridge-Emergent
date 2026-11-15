// M4-08 90% coverage: execute actual full synthetic-only preview seeder with a
// Prisma-shaped fake transaction. No network, real credentials or patient data.
import {randomBytes} from 'node:crypto';
jest.mock('../src/auth/password',()=>({
 hashPassword:jest.fn(async()=> 'fictional-test-password-hash'),
 verifyPassword:jest.fn(async()=>true),
 passwordPolicyError:jest.fn(()=>null)
}));
const {verifyPassword}=require('../src/auth/password');
import {seedChildrensHome,DEMO_EMAILS,DEMO_EXTRA_EMAILS} from '../src/cli/seed-demo';
const env=['DEPLOYMENT_ENV','DEMO_SEED_CONFIRM','DATABASE_URL','DEMO_PASSWORDS_JSON','DEMO_EXTRA_PASSWORDS_JSON'] as const;
let remembered:Record<string,string|undefined>;
const secrets=(emails:string[])=>Object.fromEntries(emails.map(email=>[
 email,'SYNTHETIC-'+randomBytes(24).toString('base64url')
]));
beforeAll(()=>{remembered=Object.fromEntries(env.map(k=>[k,process.env[k]]));});
beforeEach(()=>{
 process.env.DEPLOYMENT_ENV='ci';
 process.env.DEMO_SEED_CONFIRM='CHILDRENS_HOME_SYNTHETIC_ONLY';
 process.env.DATABASE_URL='postgresql://fictional:fictional@localhost:5432/therabridge_synthetic_test';
 process.env.DEMO_PASSWORDS_JSON=JSON.stringify(secrets(Object.values(DEMO_EMAILS)));
 process.env.DEMO_EXTRA_PASSWORDS_JSON=JSON.stringify(secrets(Object.values(DEMO_EXTRA_EMAILS)));
 (verifyPassword as jest.Mock).mockResolvedValue(true);
});
afterAll(()=>{for(const k of env)if(remembered[k]===undefined)delete process.env[k];else process.env[k]=remembered[k];});
const make=()=>{
 const methods=new Map<string,jest.Mock>();
 const operation=(model:string,name:string)=>{
  const key=model+'.'+name;
  if(!methods.has(key))methods.set(key,jest.fn(async(arg:any)=>{
   if(name==='count')return 0;
   if(name==='findUnique'||name==='findFirst')return null;
   if(name==='findMany')return [];
   if(name==='findUniqueOrThrow')throw new Error('Unexpected fictional findUniqueOrThrow');
   if(name==='upsert')return {...arg.create,version:arg.create.version??1};
   if(name==='create')return arg.data;
   throw Error('Unexpected Prisma operation '+key);
  }));
  return methods.get(key)!;
 };
 const tx:any=new Proxy({}, {get:(_,name)=>new Proxy({},{
  get:(_,method)=>operation(String(name),String(method))
 })});
 const db:any={$transaction:jest.fn(async(fn:any)=>fn(tx))};
 return {db,tx,operation,methods,run:()=>seedChildrensHome(db)};
};
describe('M4-08 full synthetic demo seeding is isolated, repeatable and fail-closed',()=>{
 test('fresh 10-account / 6-child synthetic seed executes real source end-to-end without local credential files',async()=>{
  const {run,db,operation}=make();
  const result=await run();
  expect(result).toMatchObject({
   center:'childrens-home-demo',children:6,accounts:10,appointments:15,
   historicalSessions:8,observations:16,assessments:2,plans:2,reportDrafts:2,
   credentials:'EXTERNAL HOST SECRETS'
  });
  expect(operation('user','create')).toHaveBeenCalledTimes(10);
  expect(operation('membership','upsert')).toHaveBeenCalledTimes(9);
  expect(operation('child','upsert')).toHaveBeenCalledTimes(6);
  expect(operation('sessionNote','upsert')).toHaveBeenCalledTimes(8);
  expect(operation('observation','upsert')).toHaveBeenCalledTimes(16);
  expect(db.$transaction).toHaveBeenCalledTimes(1);
 });
 test.each([['center','Unrelated centers'],['user','Unrelated accounts']])('%s unrelated rows prevent mixing synthetic demo tenant',async model=>{
  const {run,operation}=make();operation(model,'count').mockResolvedValueOnce(1);
  await expect(run()).rejects.toThrow(/unrelated users\/centres/);
  expect(operation('center','upsert')).not.toHaveBeenCalled();
 });
 test('a colliding demo center slug is rejected before any write',async()=>{
  const {run,operation}=make();operation('center','findUnique').mockResolvedValueOnce({id:'foreign-centre'});
  await expect(run()).rejects.toThrow(/slug already belongs to another centre/);
  expect(operation('user','create')).not.toHaveBeenCalled();
 });
 test('existing extra therapist with incorrect deterministic identity blocks seed',async()=>{
  const {run,operation}=make();operation('user','findUnique').mockResolvedValueOnce({
   id:'wrong-existing-id',status:'ACTIVE'
  });
  await expect(run()).rejects.toThrow(/Extra therapist email collision/);
  expect(operation('user','create')).not.toHaveBeenCalled();
 });
 test('existing extra therapist disabled cannot be silently reactivated',async()=>{
  const {run,operation}=make();
  operation('user','findUnique').mockImplementationOnce(async()=>({
   id:'not-a-valid-uuid',status:'INACTIVE'
  }));
  await expect(run()).rejects.toThrow(/Extra therapist email collision/);
 });
 test('hosted ten-password configuration rejects repeated shared account secrets before any transaction',async()=>{
  const seven=JSON.parse(process.env.DEMO_PASSWORDS_JSON!);
  const extra=JSON.parse(process.env.DEMO_EXTRA_PASSWORDS_JSON!);
  extra[Object.values(DEMO_EXTRA_EMAILS)[0]]=seven[Object.values(DEMO_EMAILS)[0]];
  process.env.DEMO_EXTRA_PASSWORDS_JSON=JSON.stringify(extra);
  const {run,db}=make();
  await expect(run()).rejects.toThrow(/ten hosted demo passwords must be distinct/);
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 test('synthetic seed never overwrites colliding deterministic center identity',async()=>{
  const {run,operation}=make();
  operation('center','findUnique').mockResolvedValueOnce(null).mockResolvedValueOnce({id:'fictional-existing'});
  operation('center','findUniqueOrThrow').mockResolvedValueOnce({slug:'another',name:'Foreign centre'});
  await expect(run()).rejects.toThrow(/Demo centre ID collision/);
 });
 test('fresh center membership assignment is tenant-locked and cannot be reused under another user',async()=>{
  const {run,operation}=make();
  operation('membership','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,userId:'different-user'
  }));
  await expect(run()).rejects.toThrow(/Demo membership changed unexpectedly/);
 });
 test('seed refuses foreign child collision rather than recording guessed family ownership',async()=>{
  const {run,operation}=make();
  operation('child','upsert').mockImplementationOnce(async({create}:any)=>({...create,centerId:'other-centre'}));
  await expect(run()).rejects.toThrow(/Child identity collision/);
 });
 test('seed refuses cross-family guardian link collision',async()=>{
  const {run,operation}=make();
  operation('guardianLink','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,userId:'another-guardian'
  }));
  await expect(run()).rejects.toThrow(/Guardian link not active or does not belong to demo family/);
 });
 test('seed rejects incorrect clinical assignment rather than granting another therapist access',async()=>{
  const {run,operation}=make();
  operation('careAssignment','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,endedAt:new Date()
  }));
  await expect(run()).rejects.toThrow(/Demo assignment is missing or revoked/);
 });
 test('seed rejects extra child patient-record scope collision during deterministic fixtures',async()=>{
  const {run,operation}=make();
  let calls=0;
  operation('child','upsert').mockImplementation(async({create}:any)=>{
   calls++;return calls===2?{...create,lastName:'wrong-family'}:create;
  });
  await expect(run()).rejects.toThrow(/Extra demo child collision/);
 });
 test('extra guardian link belongs to the exact authorized child',async()=>{
  const {run,operation}=make();
  let calls=0;operation('guardianLink','upsert').mockImplementation(async({create}:any)=>{
   calls++;return calls===2?{...create,childId:'other-child'}:create;
  });
  await expect(run()).rejects.toThrow(/Extra demo guardian link collision/);
 });
 test('extra therapist assignment collision cannot produce clinical access',async()=>{
  const {run,operation}=make();let calls=0;
  operation('careAssignment','upsert').mockImplementation(async({create}:any)=>{
   calls++;return calls===3?{...create,membershipId:'other-member'}:create;
  });
  await expect(run()).rejects.toThrow(/Extra demo care assignment collision/);
 });
 test('extra appointment collision does not silently change child attribution',async()=>{
  const {run,operation}=make();operation('appointment','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,childId:'other-child'
  }));
  await expect(run()).rejects.toThrow(/Extra demo appointment collision/);
 });
 test('template service mismatch prevents next plan from using incorrect specialty',async()=>{
  const {run,operation}=make();operation('activityTemplate','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,service:'another-specialty'
  }));
  await expect(run()).rejects.toThrow(/Activity template collision/);
 });
 test('draft assessment cross-child collision is rejected before persistence of plan evidence',async()=>{
  const {run,operation}=make();operation('assessment','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,childId:'other-child'
  }));
  await expect(run()).rejects.toThrow(/Assessment collision/);
 });
 test('wrong plan specialty cannot be accepted as the deterministic demo draft',async()=>{
  const {run,operation}=make();operation('therapyPlan','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,service:'another-specialty'
  }));
  await expect(run()).rejects.toThrow(/Plan collision/);
 });
 test('existing signed plan version is never overwritten by synthetic seed',async()=>{
  const {run,operation}=make();operation('planVersion','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,status:'APPROVED'
  }));
  await expect(run()).rejects.toThrow(/Draft version is no longer available/);
 });
 test('cross-center appointment cannot be reused under the demo family',async()=>{
  const {run,operation}=make();let calls=0;
  operation('appointment','upsert').mockImplementation(async({create}:any)=>{
   calls++;return calls===6?{...create,centerId:'foreign'}:create;
  });
  await expect(run()).rejects.toThrow(/Appointment collision/);
 });
 test('historic signed or reassigned session cannot be overwritten during demo reset',async()=>{
  const {run,operation}=make();operation('sessionNote','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,executionStatus:'SIGNED'
  }));
  await expect(run()).rejects.toThrow(/Historical session was changed/);
 });
 test('historic observation cannot migrate to another clinical plan version',async()=>{
  const {run,operation}=make();operation('observation','upsert').mockImplementationOnce(async({create}:any)=>({
   ...create,planVersionId:'other-plan'
  }));
  await expect(run()).rejects.toThrow(/Observation scope collision/);
 });
});
