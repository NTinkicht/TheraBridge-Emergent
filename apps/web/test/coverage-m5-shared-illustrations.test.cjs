const {createHash}=require('node:crypto');
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');
const {act,create}=require('react-test-renderer');
let storage,lib,assets;
beforeAll(async()=>{
 storage=await import('../src/lib/shared-illustration-storage.mjs');
 lib=await import('../src/lib/shared-illustrations.mjs');
 assets=(await import('../src/lib/shared-illustration-manifest.mjs')).SHARED_ILLUSTRATIONS;
});
const env={DEPLOYMENT_ENV:'preview',DEMO_SEED_CONFIRM:'CHILDRENS_HOME_SYNTHETIC_ONLY',TB_R2_ENDPOINT:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com/',TB_R2_BUCKET:'demo-bucket',TB_R2_REGION:'auto',TB_R2_ACCESS_KEY_ID:'b'.repeat(32),TB_R2_SECRET_ACCESS_KEY:'c'.repeat(64),TB_R2_IMPORT_ACCESS_KEY_ID:'d'.repeat(32),TB_R2_IMPORT_SECRET_ACCESS_KEY:'e'.repeat(64)};
const peg={title:'Ahmed Demo - Pegboard Grip',service:'occupational',steps:['Offer a stable pegboard and large pegs.','Record independent placements.']};
test('locked 25 references have distinct content-addressed URLs and explicit matching only',()=>{
 expect(assets).toHaveLength(25);
 expect(new Set(assets.map(lib.sharedIllustrationUrl)).size).toBe(25);
 for(const a of assets){
   expect(lib.sharedIllustration(a.id)).toBe(a);
   expect(a.digest).toMatch(/^[a-f0-9]{64}$/);
   expect(a.bytes).toBeGreaterThan(0);expect(a.bytes).toBeLessThanOrEqual(512*1024);
   expect(storage.sharedObjectKey(a)).toBe('shared-illustrations/m5-b-v1/'+a.id+'/'+a.digest+'.webp');
 }
 expect(lib.sharedIllustration('__proto__')).toBeNull();
 expect(lib.sharedIllustrationForActivity(peg).id).toBe('WU2A-S1-OCCUPATIONAL');
 expect(lib.sharedIllustrationForActivity({...peg,title:peg.title+' (sample only)'})).not.toBeNull();
 for(const wrong of [{...peg,service:'speech'},{...peg,title:'Pegboard'},{...peg,steps:null},{...peg,steps:['one']},{...peg,steps:['different',peg.steps[1]]},{...peg,steps:[peg.steps[0],'different']}])
   expect(lib.sharedIllustrationForActivity(wrong)).toBeNull();
});
test('read and write credentials are separate, all config inputs validated, signed PUT immutable',()=>{
 const cfg=storage.sharedR2Config(env),wr=storage.sharedR2Config(env,true);
 expect(cfg.id).not.toBe(wr.id);
 expect(cfg.endpoint.endsWith('/')).toBe(false);
 for(const [k,v] of Object.entries({TB_R2_ENDPOINT:'https://example.org',TB_R2_BUCKET:'../other',TB_R2_REGION:'us',TB_R2_ACCESS_KEY_ID:'wrong',TB_R2_SECRET_ACCESS_KEY:'wrong'}))
   expect(()=>storage.sharedR2Config({...env,[k]:v})).toThrow();
 expect(()=>storage.sharedR2Config({})).toThrow();
 const req=storage.signSharedRequest(wr,assets[0],'PUT',Buffer.from('fixture'),new Date('2026-01-01T00:00:00Z'));
 expect(req.headers['if-none-match']).toBe('*');
 expect(req.headers['content-type']).toBe('image/webp');
 expect(req.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=/);
});
const webp=Buffer.from('RIFF1234WEBPfixture');
const fixture={id:'test',bytes:webp.length,digest:createHash('sha256').update(webp).digest('hex')};
const reply=(body=webp,length=body.length)=>new Response(body,{headers:{'Content-Length':String(length)}});
test('read object validates length, WebP type, hash, status and bounded streaming',async()=>{
 const cfg=storage.sharedR2Config(env);
 expect(storage.verifySharedBytes(fixture,webp)).toBe(true);
 expect(storage.verifySharedBytes(fixture,Buffer.from('no'))).toBe(false);
 expect(storage.verifySharedBytes({...fixture,bytes:600000},Buffer.alloc(600000))).toBe(false);
 const badHeader=Buffer.from(webp);badHeader[0]=0;
 expect(storage.verifySharedBytes(fixture,badHeader)).toBe(false);
 const badType=Buffer.from(webp);badType[8]=0;
 expect(storage.verifySharedBytes(fixture,badType)).toBe(false);
 const badHash=Buffer.from(webp);badHash[12]^=1;
 expect(storage.verifySharedBytes(fixture,badHash)).toBe(false);
 expect(await storage.readSharedObject(fixture,cfg,async()=>reply())).toEqual(webp);
 for(const res of [new Response(null,{status:404}),new Response(null),reply(webp,1),reply(badHash),reply(Buffer.concat([webp,webp]),webp.length),reply(webp.subarray(0,-1),webp.length)])
   await expect(storage.readSharedObject(fixture,cfg,async()=>res)).rejects.toThrow();
 await expect(storage.readSharedObject(fixture,cfg,async()=>{throw Error('network')})).rejects.toThrow();
});
test('route permits only exact versioned generic assets in synthetic preview; no raw object selector',async()=>{
 const a=assets[0],file=a.digest+'.webp',read=jest.fn(async()=>webp);
 for(const [id,name,e] of [[a.id,file,{}],[a.id,file,{...env,DEMO_SEED_CONFIRM:'no'}],['../private',file,env],[a.id,'wrong.webp',env]]){
  const r=await storage.sharedIllustrationResponse(id,name,e,read);expect(r.status).toBe(404);expect(r.headers.get('cache-control')).toBe('no-store');
 }
 expect(read).not.toHaveBeenCalled();
 const r=await storage.sharedIllustrationResponse(a.id,file,env,read);
 expect(r.status).toBe(200);expect(r.headers.get('content-type')).toBe('image/webp');expect(r.headers.get('cache-control')).toContain('immutable');
 expect(Buffer.from(await r.arrayBuffer())).toEqual(webp);
 expect((await storage.sharedIllustrationResponse(a.id,file,{...env,TB_R2_ACCESS_KEY_ID:'bad'},read)).status).toBe(503);
 expect((await storage.sharedIllustrationResponse(a.id,file,env,async()=>{throw Error('R2 unavailable')})).status).toBe(503);
});
test('default reader fails closed on missing runtime config',async()=>{
 const a=assets[0];expect((await storage.sharedIllustrationResponse(a.id,a.digest+'.webp',{...env,TB_R2_ACCESS_KEY_ID:''})).status).toBe(503);
});
test('mounted shared gallery contains all references and image error does not break layout',async()=>{
 const {SharedIllustrationLibrary,SharedIllustration}=require('../src/components/clinical/SharedIllustration');
 let tree;await act(async()=>{tree=create(React.createElement(SharedIllustrationLibrary))});
 expect(tree.root.findAllByType('img')).toHaveLength(25);
 const imgs=tree.root.findAllByType('img');expect(imgs[0].props.alt).toBe(assets[0].alt);
 await act(async()=>imgs[0].props.onError());
 expect(tree.root.findAllByType('img')).toHaveLength(24);
 expect(JSON.stringify(tree.toJSON())).toContain('Reference image unavailable');
 await act(async()=>tree.update(React.createElement(SharedIllustration,{asset:assets[1]})));
 expect(tree.root.findByType('img').props.src).toBe(lib.sharedIllustrationUrl(assets[1]));
 await act(async()=>tree.unmount());
});
test('route wrapper awaits Next params',async()=>{
 const {GET}=require('../src/app/illustrations/m5-b-v1/[id]/[file]/route');
 expect((await GET(new Request('https://example.org'),{params:Promise.resolve({id:'invalid',file:'invalid'})})).status).toBe(404);
});
