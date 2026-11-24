import { privateR2Config,privateR2Key,privateR2Pointer,signR2Request,readPrivateR2,stagePrivateR2 } from '../src/common/private-r2';
const centerId='00000000-0000-4000-8000-000000000001',candidateId='00000000-0000-4000-8000-000000000002';
const bytes=Buffer.alloc(50,7),p=privateR2Pointer(centerId,candidateId,bytes);
const env={TB_R2_ENDPOINT:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',TB_R2_BUCKET:'therabridge-demo-media',
  TB_R2_REGION:'auto',TB_R2_ACCESS_KEY_ID:'b'.repeat(32),TB_R2_SECRET_ACCESS_KEY:'c'.repeat(64),
  TB_R2_IMPORT_ACCESS_KEY_ID:'d'.repeat(32),TB_R2_IMPORT_SECRET_ACCESS_KEY:'e'.repeat(64)};
const config=privateR2Config(env);
const response=(b:Buffer=bytes,status=200,length=String(b.length))=>new Response(Uint8Array.from(b),{status,headers:{'content-length':length}});
describe('private R2 ciphertext boundary',()=>{
 afterEach(()=>jest.restoreAllMocks());
 it('separates credentials and accepts canonical R2 endpoint only',()=>{
  expect(privateR2Config(env,true).accessKey).toBe(env.TB_R2_IMPORT_ACCESS_KEY_ID);
  expect(privateR2Config({...env,TB_R2_ENDPOINT:env.TB_R2_ENDPOINT+'/'}).endpoint).toBe(env.TB_R2_ENDPOINT);
  for(const patch of [{TB_R2_ENDPOINT:'http://localhost'},{TB_R2_ENDPOINT:env.TB_R2_ENDPOINT+'/evil'},
   {TB_R2_BUCKET:'../private'},{TB_R2_REGION:'us-east-1'},{TB_R2_ACCESS_KEY_ID:''},{TB_R2_SECRET_ACCESS_KEY:''}])
    expect(()=>privateR2Config({...env,...patch})).toThrow();
  expect(()=>privateR2Config({...env,TB_R2_IMPORT_SECRET_ACCESS_KEY:''},true)).toThrow();
 });
 it('binds immutable path to tenant, candidate and ciphertext digest; rejects traversal',()=>{
  expect(privateR2Key(p)).toBe('activity-cipher-v1/'+centerId+'/'+candidateId+'/'+p.digest+'.bin');
  for(const patch of [{centerId:'../'},{candidateId:'x'},{digest:'bad'},{size:29},{size:524318},{size:30.1}])
    expect(()=>privateR2Key({...p,...patch})).toThrow();
 });
 it('signs GET and conditional PUT with deterministic scope and no query credentials',()=>{
  const when=new Date('2026-11-24T00:00:00.000Z');
  const get=signR2Request(config,p,'GET',Buffer.alloc(0),when),put=signR2Request(config,p,'PUT',bytes,when);
  expect(get.url).toBe(config.endpoint+'/'+config.bucket+'/'+privateR2Key(p));
  expect(get.headers['x-amz-date']).toBe('20261124T000000Z');
  expect(get.headers.authorization).toMatch(/20261124\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}$/);
  expect(put.headers['if-none-match']).toBe('*');expect(put.headers.authorization).toContain('SignedHeaders=host;if-none-match;');
  expect(put.headers.authorization).not.toBe(get.headers.authorization);
 });
 it('reads exact bytes and rejects missing, wrong-length and tampered objects',async()=>{
  const call=jest.spyOn(global,'fetch').mockResolvedValueOnce(response());
  expect(await readPrivateR2(p,config)).toEqual(bytes);
  expect(call).toHaveBeenCalledWith(expect.stringContaining(privateR2Key(p)),expect.objectContaining({method:'GET',redirect:'error'}));
  for(const resp of [response(bytes,403),response(bytes,200,'51'),response(Buffer.alloc(50,8)),response(Buffer.alloc(51),200,'50'),response(Buffer.alloc(49),200,'50'),new Response(null,{status:200})]){
   call.mockResolvedValueOnce(resp);await expect(readPrivateR2(p,config)).rejects.toThrow();
  }
 });
 it('conditionally stages and verifies even if an object already exists',async()=>{
  const call=jest.spyOn(global,'fetch').mockResolvedValueOnce(new Response(null,{status:200})).mockResolvedValueOnce(response())
    .mockResolvedValueOnce(new Response(null,{status:412})).mockResolvedValueOnce(response());
  await stagePrivateR2(p,bytes,config);await stagePrivateR2(p,bytes,config);
  expect(call.mock.calls[0][1]).toMatchObject({method:'PUT',headers:{'if-none-match':'*'},redirect:'error'});
  await expect(stagePrivateR2(p,Buffer.alloc(50,9),config)).rejects.toThrow();
  call.mockResolvedValueOnce(new Response(null,{status:403}));
  await expect(stagePrivateR2(p,bytes,config)).rejects.toThrow();
  call.mockResolvedValueOnce(new Response(null,{status:412})).mockResolvedValueOnce(response(Buffer.alloc(50,8)));
  await expect(stagePrivateR2(p,bytes,config)).rejects.toThrow();
 });
});
