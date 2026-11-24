const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/generated-artwork.mjs',()=>{
  const items=['speech','occupational'].map(family=>({referenceId:family,family,scene:'home-support',alt:family+' fictional reference',reviewFile:family+'.png',reviewByteLength:33}));
  return {GENERATED_ARTWORK:items,verifyGeneratedReviewBytes:jest.fn()};
});
const {verifyGeneratedReviewBytes}=require('@/lib/generated-artwork.mjs');
const {GeneratedArtworkGallery}=require('../src/components/clinical/GeneratedArtworkGallery');
let tree,createUrl,revokeUrl;
beforeEach(async()=>{
  verifyGeneratedReviewBytes.mockReset();
  createUrl=jest.spyOn(URL,'createObjectURL').mockImplementation(()=> 'blob:local-'+createUrl.mock.calls.length);
  revokeUrl=jest.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  await act(async()=>{tree=create(React.createElement(GeneratedArtworkGallery));});
});
afterEach(async()=>{
  if(tree){await act(async()=>tree.unmount());tree=null;}
  createUrl.mockRestore();revokeUrl.mockRestore();
});
const file=name=>({name:name+'.png',size:33,type:'image/png',arrayBuffer:async()=>new ArrayBuffer(33)});
const upload=async files=>act(async()=>{tree.root.findByType('input').props.onChange({currentTarget:{files,value:'local'}});await Promise.resolve();});
const clear=async()=>act(async()=>tree.root.findByType('button').props.onClick());
test('entire matching collection is displayed in canonical order, cleared and reloaded',async()=>{
  verifyGeneratedReviewBytes.mockResolvedValue(true);
  await upload([file('occupational'),file('speech')]);
  expect(tree.root.findAllByType('img').map(x=>x.props.alt)).toEqual(['speech fictional reference','occupational fictional reference']);
  expect(createUrl).toHaveBeenCalledTimes(2);
  await clear();expect(revokeUrl).toHaveBeenCalledTimes(2);expect(tree.root.findAllByType('img')).toHaveLength(0);
  await upload([file('speech'),file('occupational')]);
  await act(async()=>tree.unmount());tree=null;expect(revokeUrl).toHaveBeenCalledTimes(4);
});
test('partial, duplicate, mismatched name, MIME, length, digest and read errors never reveal a partial collection',async()=>{
  await upload([file('speech')]);
  await upload([file('speech'),file('speech')]);
  verifyGeneratedReviewBytes.mockResolvedValue(true);
  await upload([file('speech'),file('other')]);
  await upload([file('speech'),{...file('occupational'),type:'image/jpeg'}]);
  await upload([file('speech'),{...file('occupational'),size:34}]);
  verifyGeneratedReviewBytes.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await upload([file('speech'),file('occupational')]);
  await upload([file('speech'),{...file('occupational'),arrayBuffer:async()=>{throw Error('read');}}]);
  expect(createUrl).not.toHaveBeenCalled();expect(tree.root.findAllByType('img')).toHaveLength(0);
});
test('clear while verification pending invalidates the entire selection',async()=>{
  let resolve;
  verifyGeneratedReviewBytes.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
  await upload([file('speech'),file('occupational')]);
  expect(tree.root.findByType('input').props.disabled).toBe(true);
  await clear();
  await act(async()=>{resolve(true);await Promise.resolve();});
  expect(createUrl).not.toHaveBeenCalled();expect(tree.root.findByType('input').props.disabled).toBe(false);
});
test('unmount pending work and revoke partial object URL creation on failure',async()=>{
  verifyGeneratedReviewBytes.mockResolvedValue(true);
  createUrl.mockReturnValueOnce('blob:first').mockImplementationOnce(()=>{throw Error('URL');});
  await upload([file('speech'),file('occupational')]);
  expect(revokeUrl).toHaveBeenCalledWith('blob:first');expect(tree.root.findAllByType('img')).toHaveLength(0);
  let resolve;
  verifyGeneratedReviewBytes.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
  await upload([file('speech'),file('occupational')]);
  await act(async()=>tree.unmount());tree=null;
  await act(async()=>{resolve(true);await Promise.resolve();});
  expect(createUrl).toHaveBeenCalledTimes(2);
});
test('cancellation before local file bytes finish reading cannot verify or display them',async()=>{
  let resolve;
  await upload([{...file('speech'),arrayBuffer:()=>new Promise(r=>{resolve=r;})},file('occupational')]);
  await clear();await act(async()=>{resolve(new ArrayBuffer(33));await Promise.resolve();});
  expect(verifyGeneratedReviewBytes).not.toHaveBeenCalled();expect(createUrl).not.toHaveBeenCalled();
});
