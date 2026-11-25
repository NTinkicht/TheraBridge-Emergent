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
const peg={id:'732827e6-da45-45c5-8142-36c9d0609367',title:'Ahmed Demo - Pegboard Grip',service:'occupational',steps:['Offer a stable pegboard and large pegs.','Record independent placements.']};
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
 expect(lib.sharedIllustrationForActivity({...peg,id:'ba4cab59-da4f-459a-8fb1-55e8f83877ad',title:peg.title+' (sample only)'})).not.toBeNull();
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
test('all 25 bundled thumbnails are served in preview without any R2 credentials, with exact hashes',async()=>{
 const preview={DEPLOYMENT_ENV:'preview',DEMO_SEED_CONFIRM:'CHILDRENS_HOME_SYNTHETIC_ONLY'};
 for(const a of assets){const r=await storage.sharedIllustrationResponse(a.id,a.digest+'.webp',preview);expect(r.status).toBe(200);expect(r.headers.get('content-type')).toBe('image/webp');const bytes=Buffer.from(await r.arrayBuffer());expect(bytes.length).toBe(a.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.digest);expect((await storage.sharedIllustrationResponse(a.id,a.digest+'.webp',{...preview,DEPLOYMENT_ENV:'production'})).status).toBe(404);}
});
test('bundled reader handles both working directories, refuses unknown or damaged bytes, and falls back only for missing assets',async()=>{
 const a=assets[0],bytes=await storage.readBundledSharedObject(a);const missing=Object.assign(new Error('missing'),{code:'ENOENT'});let calls=0;
 expect(await storage.readBundledSharedObject(a,async()=>{if(++calls===1)throw missing;return bytes},'/tmp/demo')).toEqual(bytes);expect(calls).toBe(2);
 await expect(storage.readBundledSharedObject({...a,id:'../private'})).rejects.toThrow('shared_integrity');
 await expect(storage.readBundledSharedObject({...a,digest:'wrong'})).rejects.toThrow('shared_integrity');
 await expect(storage.readBundledSharedObject({...a,bytes:1})).rejects.toThrow('shared_integrity');
 await expect(storage.readBundledSharedObject(a,async()=>Buffer.from('damaged'))).rejects.toThrow('shared_integrity');
 await expect(storage.readBundledSharedObject(a,async()=>{throw missing})).rejects.toThrow('shared_bundle_missing');
 await expect(storage.readBundledSharedObject(a,async()=>{throw Error('permission')})).rejects.toThrow('permission');
 const remote=jest.fn(async()=>bytes);expect(await storage.readDemoSharedObject(a,env,async()=>{throw Error('shared_bundle_missing')},remote)).toEqual(bytes);expect(remote).toHaveBeenCalledTimes(1);
 await expect(storage.readDemoSharedObject(a,env,async()=>{throw Error('shared_integrity')},remote)).rejects.toThrow('shared_integrity');expect(remote).toHaveBeenCalledTimes(1);
 await expect(storage.readDemoSharedObject(a,{},async()=>{throw Error('shared_bundle_missing')},remote)).rejects.toThrow('shared_config_invalid');
});
test('mounted shared gallery contains all references and image error does not break layout',async()=>{
 const {SharedIllustrationLibrary,SharedIllustration}=require('../src/components/clinical/SharedIllustration');
 let tree;await act(async()=>{tree=create(React.createElement(SharedIllustrationLibrary))});
 expect(tree.root.findAllByType('img')).toHaveLength(25);
 const imgs=tree.root.findAllByType('img');expect(imgs[0].props.alt).toBe(assets[0].alt);
 expect(tree.root.findAllByType('figcaption')).toHaveLength(0);
 expect(JSON.stringify(tree.toJSON())).not.toContain('Specialty reference art (not instructions)');
 expect(imgs[0].props.className).toContain('h-auto w-full');
 expect(imgs[0].props.className).not.toMatch(/max-h-|object-contain/);
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


test('all 67 frozen demo catalogue identities use relevant specialty artwork; modified or unknown entries stay unmapped', async()=>{
 const {DEMO_ILLUSTRATION_MAP}=await import('../src/lib/demo-illustration-map.mjs');
 expect(DEMO_ILLUSTRATION_MAP).toHaveLength(67);
 expect(new Set(DEMO_ILLUSTRATION_MAP.map(x=>x.id)).size).toBe(67);
 for(const t of DEMO_ILLUSTRATION_MAP){
  expect(lib.sharedIllustrationForActivity(t)?.family).toBe(t.service);
  expect(lib.sharedIllustrationForActivity({...t, title:'Unrelated custom activity'})).toBeNull();
  expect(lib.sharedIllustrationForActivity({...t, steps:['Changed clinical instructions']})).toBeNull();
  expect(lib.sharedIllustrationForActivity({...t,id:'not-a-demo-id'})).toBeNull();
 }
});


test('fresh migration samples with generated UUIDs match only in synthetic library contexts',async()=>{
 const {readFileSync}=require('node:fs');const {resolve}=require('node:path');const {randomUUID}=require('node:crypto');
 const sql=readFileSync(resolve(__dirname,'../../api/prisma/migrations/20261025090000_tb_em_008_clinical_workspace/migration.sql'),'utf8');
 const records=[...sql.matchAll(/\(gen_random_uuid\(\), NULL, '([^']+)', '([^']+)', '[^']+', \d+, ARRAY\[[^\]]*\], ARRAY\[([^\]]*)\]/g)].map(m=>({id:randomUUID(),title:m[1],service:m[2],steps:[...m[3].matchAll(/'((?:''|[^'])*)'/g)].map(x=>x[1].replaceAll("''","'"))}));
 expect(records).toHaveLength(4);
 for(const row of records){expect(lib.sharedIllustrationForActivity({...row,library:'synthetic'})?.family).toBe(row.service);expect(lib.sharedIllustrationForActivity(row,true)?.family).toBe(row.service);expect(lib.sharedIllustrationForActivity({...row,library:'center'})).toBeNull();expect(lib.sharedIllustrationForActivity({...row,steps:['modified']},true)).toBeNull();}
});


test('actual guardian catalogue cards render images for every current family sample',async()=>{
 const {DEMO_ILLUSTRATION_MAP}=await import('../src/lib/demo-illustration-map.mjs');
 const {ActivityCard}=require('../src/components/clinical/ActivityCard');
 const family=DEMO_ILLUSTRATION_MAP.filter(x=>['Bubble breath and sounds','Snack-time choices','Playdough pinch and roll','Pillow path balance walk'].includes(x.title)||x.title.includes('(sample only)')||x.title.startsWith('Synthetic demo - '));
 expect(family).toHaveLength(9);
 for(const t of family){let tree;await act(async()=>{tree=create(React.createElement(ActivityCard,{t:{...t,materials:[],safety:[],minutes:10,ageBand:'sample'},tone:'family',visual:true,syntheticSample:true}))});expect(tree.root.findByType('img').props.src).toBe(lib.sharedIllustrationUrl(lib.sharedIllustrationForActivity(t,true)));const media=tree.root.findByProps({'data-testid':'activity-media-placeholder-'+t.id});expect(media.props.className).toContain('w-full');expect(media.props.className).not.toContain('max-h-48');expect(media.props.className).toContain('overflow-hidden');expect(tree.root.findAllByType('figcaption')).toHaveLength(0);await act(async()=>tree.unmount());}
});
