import { randomBytes } from 'node:crypto';
import { sealPrivateData,openPrivateData } from '../src/common/private-envelope';
const center='11111111-1111-4111-8111-111111111111';
const child='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const OLD=process.env.TB_PRIVATE_DATA_KEY_B64;
beforeEach(()=>{process.env.TB_PRIVATE_DATA_KEY_B64=randomBytes(32).toString('base64');});
afterAll(()=>{if(OLD===undefined)delete process.env.TB_PRIVATE_DATA_KEY_B64;else process.env.TB_PRIVATE_DATA_KEY_B64=OLD;});

describe('private clinical and photo envelopes',()=>{
 it('roundtrips only with the exact original tenant, subject and kind',()=>{
  const plain=Buffer.from(JSON.stringify({allergies:'synthetic-peanut'}));
  const a=sealPrivateData(plain,'care-v1',center,child);
  const b=sealPrivateData(plain,'care-v1',center,child);
  expect(a).not.toEqual(b);
  expect(a.includes(plain)).toBe(false);
  expect(openPrivateData(a,'care-v1',center,child)).toEqual(plain);
  for(const tuple of [
   ['care-v1',other,child],['care-v1',center,other],['child-photo-v1',center,child],
  ])expect(()=>openPrivateData(a,tuple[0],tuple[1],tuple[2])).toThrow();
 });
 it('rejects ciphertext tampering, wrong version, missing tags and wrong key',()=>{
  const a=sealPrivateData(Buffer.from('synthetic-only'),'care-v1',center,child);
  for(const change of [
   (x:Buffer)=>{x[x.length-1]^=1;},
   (x:Buffer)=>{x[1]^=1;},
   (x:Buffer)=>{x[12]^=1;},
   (x:Buffer)=>{x[20]^=1;},
   (x:Buffer)=>{x[0]=2;},
  ]){const x=Buffer.from(a);change(x);expect(()=>openPrivateData(x,'care-v1',center,child)).toThrow();}
  expect(()=>openPrivateData(Buffer.alloc(29),'care-v1',center,child)).toThrow();
  process.env.TB_PRIVATE_DATA_KEY_B64=randomBytes(32).toString('base64');
  expect(()=>openPrivateData(a,'care-v1',center,child)).toThrow();
 });
 it('fail-closes if encryption key is missing, noncanonical or not 256 bit',()=>{
  for(const invalid of [undefined,'', 'YQ==','bad-key',Buffer.alloc(32).toString('base64').replace('=','')]){
    if(invalid===undefined)delete process.env.TB_PRIVATE_DATA_KEY_B64;
    else process.env.TB_PRIVATE_DATA_KEY_B64=invalid;
    expect(()=>sealPrivateData(Buffer.from('test'),'care-v1',center,child)).toThrow();
  }
 });
 it('rejects invalid subject scope, unsupported data domain and unbounded plaintext',()=>{
  expect(()=>sealPrivateData(Buffer.from('test'),'care-v1','other',child)).toThrow();
  expect(()=>sealPrivateData(Buffer.from('test'),'raw-audio-v1',center,child)).toThrow();
  expect(()=>sealPrivateData(Buffer.alloc(0),'care-v1',center,child)).toThrow();
  expect(()=>sealPrivateData(Buffer.alloc(9*1024*1024+1),'care-v1',center,child)).toThrow();
 });
});
