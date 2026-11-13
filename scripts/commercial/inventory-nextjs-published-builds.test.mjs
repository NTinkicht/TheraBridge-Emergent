import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {tarballUrl,checkSRI,readArchive,sourceRecipe,reportStatus} from './inventory-nextjs-published-builds.mjs';

function header(name,data,type=48){
 const h=Buffer.alloc(512);
 h.write(name,0,100,'utf8');
 h.write('0000644\0',100);h.write('0000000\0',108);h.write('0000000\0',116);
 h.write(data.length.toString(8).padStart(11,'0')+'\0',124);
 h.write('00000000000\0',136);h.fill(32,148,156);h[156]=type;
 h.write('ustar\0',257);
 let sum=0;for(const b of h)sum+=b;
 h.write(sum.toString(8).padStart(6,'0')+'\0 ',148);
 return Buffer.concat([h,data,Buffer.alloc((512-data.length%512)%512)]);
}
function sample(name='package/dist/index.js',data=Buffer.from('generated')){
 return gzipSync(Buffer.concat([header('package/package.json',Buffer.from('{"name":"@next/env","version":"14.2.35"}')),
  header(name,data),Buffer.alloc(1024)]));
}
const sri=bytes=>'sha512-'+createHash('sha512').update(bytes).digest('base64');
test('exact npm registry archive selection is restricted to the three signed versions',()=>{
 assert.equal(tarballUrl('@next/env','14.2.35'),
  'https://registry.npmjs.org/%40next%2Fenv/-/env-14.2.35.tgz');
 assert.equal(tarballUrl('@next/swc-linux-x64-gnu','14.2.33'),
  'https://registry.npmjs.org/%40next%2Fswc-linux-x64-gnu/-/swc-linux-x64-gnu-14.2.33.tgz');
 for(const [n,v] of [['evil','1.0.0'],['@next/env','14.2.34'],
  ['@next/swc-linux-x64-musl','14.2.35'],['@next/env','../bad']])
  assert.throws(()=>tarballUrl(n,v),/UNEXPECTED_NPM_PACKAGE/);
});
test('published archive exact SRI is mandatory and gzip file listing is bounded',()=>{
 const bytes=sample();
 const digest=checkSRI(bytes,sri(bytes));
 assert.equal(digest,createHash('sha256').update(bytes).digest('hex'));
 const parsed=readArchive(bytes);
 assert.deepEqual(parsed.files.map(x=>x.path),['dist/index.js','package.json']);
 assert.equal(parsed.files.find(f=>f.path==='dist/index.js').sha256,
  createHash('sha256').update('generated').digest('hex'));
 assert.throws(()=>checkSRI(bytes,sri(Buffer.from('wrong'))),/EXACT_NPM_TARBALL_SRI_MISMATCH/);
 assert.throws(()=>readArchive(Buffer.from('invalid')),/INVALID_OR_OVERSIZE_NPM_ARCHIVE/);
});
test('reject duplicate and traversal paths; do not extract or execute tarball files',()=>{
 const dup=gzipSync(Buffer.concat([
  header('package/dist/index.js',Buffer.from('a')),
  header('package/dist/index.js',Buffer.from('b')),Buffer.alloc(1024)]));
 assert.throws(()=>readArchive(dup),/UNSAFE_OR_DUPLICATE_PACKAGE_PATH/);
 for(const path of ['package/../secret','package/a\\..','evil/file']){
  const archive=gzipSync(Buffer.concat([header(path,Buffer.from('x')),Buffer.alloc(1024)]));
  assert.throws(()=>readArchive(archive),/UNSAFE_OR_DUPLICATE_PACKAGE_PATH/);
 }
});
test('never promote symlink or unsupported global archive metadata to source evidence',()=>{
 for(const type of [50,103,76,75]){
  const a=gzipSync(Buffer.concat([header('package/dist/file',Buffer.from('x'),type),Buffer.alloc(1024)]));
  assert.throws(()=>readArchive(a),/UNSUPPORTED_NONREGULAR_TAR_ENTRY|UNSUPPORTED_TAR_EXTENSION/);
 }
});
test('direct environment package requires actual pinned ncc and TypeScript release scripts',()=>{
 const manifest=Buffer.from(JSON.stringify({name:'@next/env',version:'14.2.35',
  scripts:{release:'ncc build ./index.ts -o ./dist/ --minify',types:'tsc index.ts --declaration'},
  devDependencies:{'@vercel/ncc':'0.34.0'}}));
 const result=sourceRecipe(manifest,{name:'@next/env',version:'14.2.35'});
 assert.equal(result.type,'NCC_TYPESCRIPT_RELEASE_BUILD');
 assert.equal(result.pinnedBuildInputs.ncc,'0.34.0');
 assert.equal(result.reproduciblePublishedArchive,false);
 assert.throws(()=>sourceRecipe(Buffer.from('{"name":"@next/env","version":"14.2.35"}'),
  {name:'@next/env',version:'14.2.35'}),/ENV_SOURCE_BUILD_RECIPE_MISSING/);
 assert.throws(()=>sourceRecipe(manifest,{name:'@next/env',version:'14.2.34'}),/SOURCE_BUILD_RECIPE_VERSION_MISMATCH/);
});
test('native SWC source requires N-API Rust build recipe and does not claim binary reproducibility',()=>{
 const manifest=Buffer.from(JSON.stringify({name:'@next/swc',version:'14.2.33',
  scripts:{'build-native-release':'napi build --platform -p next-swc-napi --release'},
  devDependencies:{'@napi-rs/cli':'2.18.0'}}));
 const result=sourceRecipe(manifest,{name:'@next/swc',version:'14.2.33'});
 assert.equal(result.type,'RUST_NAPI_RELEASE_BUILD');
 assert.equal(result.requiresSourceToolchainCargoLockAndTarget,true);
 assert.equal(result.reproduciblePublishedArchive,false);
 assert.throws(()=>sourceRecipe(Buffer.from('{}'),{name:'@next/swc',version:'14.2.33'}));
});

test('Codex P2: incomplete or unavailable archives cannot receive success status',()=>{
 const yes={archiveStatus:'INTEGRITY_VERIFIED_PUBLISHED_FILE_INVENTORY_NOT_REPRODUCIBILITY',
  buildRecipeStatus:'SIGNED_COMMIT_BUILD_RECIPE_CAPTURED_NOT_EXECUTED'};
 const absent={archiveStatus:'UNVERIFIED_REGISTRY_TIMEOUT',buildRecipeStatus:'NOT_VERIFIED'};
 assert.equal(reportStatus([absent,absent,absent]),'NO_VERIFIED_PUBLISHED_ARCHIVE_EVIDENCE');
 assert.equal(reportStatus([yes,absent,absent]),'PARTIAL_PUBLISHED_ARCHIVE_EVIDENCE_REMAINING_UNVERIFIED');
 assert.equal(reportStatus([yes,yes,{...yes,buildRecipeStatus:'UNVERIFIED_RECIPE'}]),
  'PARTIAL_PUBLISHED_ARCHIVE_EVIDENCE_REMAINING_UNVERIFIED');
 assert.equal(reportStatus([yes,yes,yes]),
  'ALL_THREE_PUBLISHED_ARCHIVE_INVENTORIES_AND_RECIPES_VERIFIED_NOT_REPRODUCIBLE_BUILDS');
 assert.equal(reportStatus([yes,yes]),'PARTIAL_PUBLISHED_ARCHIVE_EVIDENCE_REMAINING_UNVERIFIED');
});
test('Codex P2: complete per-file hash evidence is deterministic and remains available',()=>{
 const archive=readArchive(sample());
 assert(archive.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)&&
  typeof x.path==='string'&&Number.isInteger(x.bytes)));
 const listing=JSON.stringify(archive.files);
 assert.equal(JSON.stringify(readArchive(sample()).files),listing);
 assert.equal(archive.files.find(x=>x.path==='dist/index.js').bytes,9);
});
