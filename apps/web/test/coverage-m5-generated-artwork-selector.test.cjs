const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/generated-artwork.mjs',()=>{
 const asset={referenceId:'WU2A-S1-SPEECH',family:'speech',scene:'therapist-guided',
   reviewFile:'wu2a-s1-speech-review.png',reviewByteLength:33,alt:'Fictional therapy reference',
   reviewSha256:'a'.repeat(64)};
 const other={...asset,referenceId:'WU2A-S1-OCCUPATIONAL',family:'occupational'};
 return {GENERATED_ARTWORK:[asset,other],findGeneratedArtwork:id=>[asset,other].find(a=>a.referenceId===id)??null,
   verifyGeneratedReviewBytes:jest.fn()};
});
const {verifyGeneratedReviewBytes}=require('@/lib/generated-artwork.mjs');
const {GeneratedArtworkSelector}=require('../src/components/clinical/GeneratedArtworkSelector');
let tree,createUrl,revokeUrl,onSelect;
beforeEach(()=>{
 onSelect=jest.fn();
 createUrl=jest.spyOn(URL,'createObjectURL').mockReturnValue('blob:local-test');
 revokeUrl=jest.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 verifyGeneratedReviewBytes.mockReset();
});
afterEach(async()=>{
 if(tree){await act(async()=>tree.unmount());tree=null;}
 createUrl.mockRestore();revokeUrl.mockRestore();
});
const render=async(service='speech')=>act(async()=>{tree=create(React.createElement(GeneratedArtworkSelector,{service,onSelect}));});
const select=async(id='WU2A-S1-SPEECH')=>act(async()=>tree.root.findByType('select').props.onChange({target:{value:id}}));
const upload=async(file)=>act(async()=>{tree.root.findByType('input').props.onChange({currentTarget:{files:file?[file]:[],value:'local.png'}});await Promise.resolve();});
const good=()=>({type:'image/png',size:33,arrayBuffer:async()=>new ArrayBuffer(33)});
test('filters specialty and permits local preview only after exact verifier success',async()=>{
 await render();
 expect(tree.root.findAllByType('option').map(x=>x.props.value)).toEqual(['','WU2A-S1-SPEECH']);
 await select();
 await upload({...good(),type:'image/jpeg'});
 expect(createUrl).not.toHaveBeenCalled();
 verifyGeneratedReviewBytes.mockResolvedValueOnce(false);
 await upload(good());
 expect(createUrl).not.toHaveBeenCalled();
 verifyGeneratedReviewBytes.mockResolvedValueOnce(true);
 await upload(good());
 expect(tree.root.findByType('img').props.alt).toBe('Fictional therapy reference');
 await act(async()=>tree.root.findByType('button').props.onClick());
 expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({referenceId:'WU2A-S1-SPEECH'}));
 await select('');
 expect(revokeUrl).toHaveBeenCalledWith('blob:local-test');
 expect(tree.root.findAllByType('img')).toHaveLength(0);
});
test('invalidates a pending verification after the reference changes',async()=>{
 await render();
 await select();
 let release;
 verifyGeneratedReviewBytes.mockReturnValueOnce(new Promise(resolve=>{release=resolve;}));
 await upload(good());
 await select('');
 await act(async()=>{release(true);await Promise.resolve();});
 expect(createUrl).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('img')).toHaveLength(0);
});
test('clears object URL on unmount and handles missing file',async()=>{
 await render('feeding');
 expect(tree.root.findAllByType('option').map(x=>x.props.value)).toEqual(['','WU2A-S1-OCCUPATIONAL']);
 await select('WU2A-S1-OCCUPATIONAL');
 await upload(undefined);
 verifyGeneratedReviewBytes.mockResolvedValueOnce(true);
 await upload(good());
 await act(async()=>tree.unmount());tree=null;
 expect(revokeUrl).toHaveBeenCalledWith('blob:local-test');
});
