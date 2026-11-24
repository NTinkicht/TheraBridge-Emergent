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

test('rejects wrong byte length and read failures; disables controls while verification is pending',async()=>{
 await render();await select();
 await upload({...good(),size:34});
 expect(verifyGeneratedReviewBytes).not.toHaveBeenCalled();
 await upload({...good(),arrayBuffer:async()=>{throw Error('local read failed');}});
 expect(createUrl).not.toHaveBeenCalled();
 let finish;
 verifyGeneratedReviewBytes.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 await upload(good());
 expect(tree.root.findByType('input').props.disabled).toBe(true);
 await act(async()=>{finish(true);await Promise.resolve();});
 expect(tree.root.findByType('input').props.disabled).toBe(false);
 await act(async()=>tree.update(React.createElement(GeneratedArtworkSelector,{service:'speech',onSelect,disabled:true})));
 expect(tree.root.findByType('select').props.disabled).toBe(true);
 expect(tree.root.findByType('input').props.disabled).toBe(true);
 expect(tree.root.findByType('button').props.disabled).toBe(true);
});
test('no service filter exposes reference choices; developmental alias selects only behavioral art',async()=>{
 await act(async()=>{tree=create(React.createElement(GeneratedArtworkSelector,{onSelect}));});
 expect(tree.root.findAllByType('option').map(x=>x.props.value)).toEqual(['','WU2A-S1-SPEECH','WU2A-S1-OCCUPATIONAL']);
 await act(async()=>tree.update(React.createElement(GeneratedArtworkSelector,{service:'developmental',onSelect})));
 expect(tree.root.findAllByType('option').map(x=>x.props.value)).toEqual(['']);
});
test('switching service while a verification is pending cannot reveal the earlier image',async()=>{
 await render();await select();
 let finish;
 verifyGeneratedReviewBytes.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 await upload(good());
 await act(async()=>tree.update(React.createElement(GeneratedArtworkSelector,{service:'occupational',onSelect})));
 await act(async()=>{finish(true);await Promise.resolve();});
 expect(createUrl).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('img')).toHaveLength(0);
 expect(onSelect).not.toHaveBeenCalled();
});
