// M5-14: execute real staff-only draft-panel interaction branches with fictional metadata.
// No clinical approvals, media bytes, publication, external calls, or patient information.
const React = require('react');
const Renderer = require('react-test-renderer');
const {act, create} = Renderer;
const h = React.createElement;
jest.mock('@/lib/activity-media', () => ({
  activityMediaDrafts: {
    endpoint: (c,t) => '/api/centers/'+c+'/activities/'+t+'/media-drafts',
    list: jest.fn(), propose: jest.fn(), reject: jest.fn(), uploadCandidate: jest.fn()
  }
}));
const {activityMediaDrafts: api} = require('../src/lib/activity-media');
const {ActivityMediaDraftPanel} = require('../src/components/clinical/ActivityMediaDraftPanel');
const draft = (overrides={}) => ({
  id:'draft-a', templateId:'activity-a', centerId:'center-a', templateVersion:2,
  state:'DRAFT', version:1, sourceType:'ORIGINAL', styleVersion:'m5-b-v1',
  sceneType:'fine-motor', altText:'Fictional child sorting colored blocks',
  license:'INTERNAL-REVIEW', sourceReference:'SYNTHETIC-REFERENCE-123',
  rejectionReason:null, ...overrides
});
let tree;
const output=()=>JSON.stringify(tree.toJSON());
const buttons=()=>tree.root.findAllByType('button');
const textOf=c=>typeof c==='string'?c:Array.isArray(c)?c.map(textOf).join(''):
  React.isValidElement(c)?textOf(c.props.children):'';
const label=b=>textOf(b.props.children);
const button=phrase=>{const b=buttons().find(x=>label(x).includes(phrase));if(!b)throw Error('Missing button: '+phrase);return b;};
const click=async phrase=>act(async()=>{button(phrase).props.onClick();await Promise.resolve();});
const change=async(labelText,value)=>{
  const control=tree.root.findAllByType('label').find(x=>textOf(x.props.children).includes(labelText));
  if(!control)throw Error('Missing label: '+labelText);
  const input=control.findAll(x=>typeof x.type==='string'&&['input','select','textarea'].includes(x.type))[0];
  if(!input)throw Error('Missing input: '+labelText);
  await act(async()=>input.props.onChange({target:{value}}));
};
const mount=async(version=2,steps=[])=>act(async()=>{tree=create(h(ActivityMediaDraftPanel,{
  centerId:'center-a',templateId:'activity-a',templateVersion:version,steps
}));});
beforeEach(()=>{jest.resetAllMocks();tree=null;api.list.mockResolvedValue({items:[],nextCursor:null,hasMore:false});});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const open=async()=>click('Illustration proposals');

describe('actual mounted private media proposal workflow',()=>{
  it('is collapsed by default, then loads an empty scoped private list',async()=>{
    await mount();expect(output()).not.toContain('Private illustration proposal registry');
    await open();
    expect(api.list).toHaveBeenCalledWith('center-a','activity-a');
    expect(output()).toContain('No proposals registered');
    expect(output()).toContain('No image publication is available');
    await click('Close illustration proposals');
    expect(output()).not.toContain('Private illustration proposal registry');
  });
  it('renders existing drafts, rejection provenance and disabled publication paths',async()=>{
    api.list.mockResolvedValue({items:[draft(),draft({
      id:'draft-b',state:'REJECTED',rejectionReason:'Unsafe fictional posture'
    })],nextCursor:null,hasMore:false});
    await mount();await open();
    expect(output()).toContain('Unsafe fictional posture');
    expect(output()).toContain('SYNTHETIC-REFERENCE-123');
    expect(output()).not.toContain('Publish image');
    expect(button('Reject draft')).toBeTruthy();
  });
  it('requires full provenance fields before proposal and omits provider terms for original work',async()=>{
    await mount();await open();
    expect(button('Save private metadata draft').props.disabled).toBeTruthy();
    await change('Scene type','Guided fictional play');
    await change('License or rights basis','INTERNAL_REVIEW_ONLY');
    await change('Provenance / source evidence reference','SYNTHETIC-123');
    await change('Proposed accessible description','Two fictional blocks on a table');
    api.propose.mockResolvedValue(draft());
    expect(button('Save private metadata draft').props.disabled).toBeFalsy();
    await click('Save private metadata draft');
    expect(api.propose).toHaveBeenCalledWith('center-a','activity-a',expect.objectContaining({
      templateVersion:2,sourceType:'ORIGINAL',providerTerms:undefined,
      license:'INTERNAL_REVIEW_ONLY'
    }));
    expect(output()).toContain('No image was uploaded');
    expect(output()).toContain('Fictional child sorting colored blocks');
  });
  it('binds private artwork metadata to an actual numbered source step',async()=>{
    await mount(2,['Select fictional card','Place on table']);
    await open();
    await change('Illustration target','2');
    await change('Scene type','Guided fictional play');
    await change('License or rights basis','INTERNAL_REVIEW_ONLY');
    await change('Provenance / source evidence reference','SYNTHETIC-STEP-123');
    await change('Proposed accessible description','A fictional character placing neutral cards');
    api.propose.mockResolvedValue(draft({stepNumber:2}));
    await click('Save private metadata draft');
    expect(api.propose).toHaveBeenCalledWith('center-a','activity-a',
      expect.objectContaining({stepNumber:2,templateVersion:2}));
    expect(output()).toContain('Step 2');
  });
  it('defaults to whole activity when no step is selected',async()=>{
    await mount(2,['Synthetic step']);
    await open();
    await change('Scene type','Guided fictional play');
    await change('License or rights basis','INTERNAL_REVIEW_ONLY');
    await change('Provenance / source evidence reference','SYNTHETIC-WHOLE-123');
    await change('Proposed accessible description','A fictional character choosing safe cards');
    api.propose.mockResolvedValue(draft({stepNumber:null}));
    await click('Save private metadata draft');
    expect(api.propose).toHaveBeenCalledWith('center-a','activity-a',
      expect.objectContaining({stepNumber:undefined}));
    expect(output()).toContain('whole activity');
  });
  it('blocks generated artwork until provider terms are entered',async()=>{
    await mount();await open();
    await change('Artwork source type','GENERATED');
    await change('Scene type','Fictional learning');
    await change('License or rights basis','INTERNAL_REVIEW_ONLY');
    await change('Provenance / source evidence reference','SYNTHETIC-123');
    await change('Proposed accessible description','Fictional illustrated child with toy');
    expect(button('Save private metadata draft').props.disabled).toBeTruthy();
    await change('Provider commercial terms evidence','Provider terms fictional approval NOT_OBTAINED');
    api.propose.mockResolvedValue(draft({id:'gen-a',sourceType:'GENERATED'}));
    await click('Save private metadata draft');
    expect(api.propose).toHaveBeenCalledWith('center-a','activity-a',
      expect.objectContaining({providerTerms:'Provider terms fictional approval NOT_OBTAINED'}));
  });
  it('preserves edits when proposal API fails',async()=>{
    await mount();await open();
    await change('Scene type','Fictional motor');
    await change('License or rights basis','INTERNAL_REVIEW_ONLY');
    await change('Provenance / source evidence reference','SYNTHETIC-123');
    await change('Proposed accessible description','Fictional blocks safely aligned');
    api.propose.mockRejectedValue(new Error('Synthetic network failure'));
    await click('Save private metadata draft');
    expect(output()).toContain('Could not save');
    const inputs=tree.root.findAllByType('input');
    expect(inputs.some(x=>x.props.value==='Fictional motor')).toBe(true);
  });
  it('refuses draft submission when activity version is absent',async()=>{
    await mount(null);await open();
    expect(output()).toContain('Activity version unavailable');
    expect(button('Save private metadata draft').props.disabled).toBeTruthy();
    expect(api.propose).not.toHaveBeenCalled();
  });
  it('records a scoped, version-pinned rejection with a complete reason',async()=>{
    api.list.mockResolvedValue({items:[draft()],nextCursor:null,hasMore:false});
    api.reject.mockResolvedValue({id:'draft-a',state:'REJECTED',version:2});
    await mount();await open();await click('Reject draft');
    expect(button('Record rejection').props.disabled).toBeTruthy();
    await change('Reason for rejection','Unsafe synthetic positioning');
    await click('Record rejection');
    expect(api.reject).toHaveBeenCalledWith('center-a','activity-a','draft-a',1,'Unsafe synthetic positioning');
    expect(output()).toContain('Draft rejected.');
    expect(output()).toContain('Unsafe synthetic positioning');
    expect(output()).not.toContain('Record rejection');
  });
  it('can cancel rejection and preserves the original draft',async()=>{
    api.list.mockResolvedValue({items:[draft()],nextCursor:null,hasMore:false});
    await mount();await open();await click('Reject draft');
    await change('Reason for rejection','Unsuitable imaginary artwork');
    await click('Cancel');
    expect(api.reject).not.toHaveBeenCalled();
    expect(button('Reject draft')).toBeTruthy();
  });
  it('shows a safe error if the optimistic revision is rejected',async()=>{
    api.list.mockResolvedValue({items:[draft()],nextCursor:null,hasMore:false});
    api.reject.mockRejectedValue(new Error('Synthetic conflict'));
    await mount();await open();await click('Reject draft');
    await change('Reason for rejection','Unsuitable imaginary artwork');
    await click('Record rejection');
    expect(output()).toContain('Could not reject this version');
    expect(output()).toContain('Unsuitable imaginary artwork');
  });
  it('loads older pages with deduplication and keeps newer rows visible',async()=>{
    api.list.mockResolvedValueOnce({items:[draft()],hasMore:true,nextCursor:'page-2'})
      .mockResolvedValueOnce({items:[draft(),draft({id:'draft-older'})],hasMore:false,nextCursor:null});
    await mount();await open();
    await click('Load older proposals');
    expect(api.list).toHaveBeenLastCalledWith('center-a','activity-a','page-2');
    expect(output()).toContain('Fictional child sorting colored blocks');
    expect(tree.root.findAllByType('li')).toHaveLength(2);
  });
  it('retains visible history after a failed older page and retries',async()=>{
    api.list.mockResolvedValueOnce({items:[draft()],hasMore:true,nextCursor:'page-2'})
      .mockRejectedValueOnce(new Error('Synthetic timeout'))
      .mockResolvedValueOnce({items:[draft({id:'draft-later'})],hasMore:false,nextCursor:null});
    await mount();await open();await click('Load older proposals');
    expect(output()).toContain('Older proposals could not be loaded');
    expect(tree.root.findAllByType('li')).toHaveLength(1);
    await click('Load older proposals');expect(tree.root.findAllByType('li')).toHaveLength(2);
  });
  it('refuses stale paginated replies after close/reopen',async()=>{
    let release;const delayed=new Promise(resolve=>{release=resolve;});
    api.list.mockResolvedValueOnce({items:[draft()],hasMore:true,nextCursor:'page-2'})
      .mockImplementationOnce(()=>delayed)
      .mockResolvedValueOnce({items:[],hasMore:false,nextCursor:null});
    await mount();await open();
    await act(async()=>{button('Load older proposals').props.onClick();await Promise.resolve();});
    await click('Close illustration proposals');await open();
    await act(async()=>release({items:[draft({id:'stale-secret'})],nextCursor:null,hasMore:false}));
    expect(output()).not.toContain('stale-secret');
  });
  it('renders a retryable failure for initial list transport errors',async()=>{
    api.list.mockRejectedValueOnce(new Error('Synthetic denial'));
    await mount();await open();
    expect(output()).toContain('Could not load illustration proposals');
  });
  it('opens and closes private intake only on the current rights proposal version',async()=>{
    api.list.mockResolvedValue({items:[draft()],nextCursor:null,hasMore:false});
    await mount();await open();
    expect(button('Attach scanned private PNG')).toBeTruthy();
    await click('Attach scanned private PNG');
    expect(tree.root.findAllByProps({'data-testid':'private-png-candidate-picker'})).toHaveLength(1);
    await click('Close private image intake');
    expect(tree.root.findAllByProps({'data-testid':'private-png-candidate-picker'})).toHaveLength(0);
    expect(api.uploadCandidate).not.toHaveBeenCalled();
  });
  it('refuses staging an image when metadata is stale or rejected',async()=>{
    api.list.mockResolvedValue({items:[draft({templateVersion:2}),
      draft({id:'rejected',state:'REJECTED'})],nextCursor:null,hasMore:false});
    await mount(3);await open();
    expect(buttons().filter(x=>label(x).includes('Attach scanned private PNG'))).toHaveLength(0);
    expect(api.uploadCandidate).not.toHaveBeenCalled();
  });
  it('stages only a private candidate with exact center/template/draft and never publishes',async()=>{
    api.list.mockResolvedValue({items:[draft()],nextCursor:null,hasMore:false});
    api.uploadCandidate.mockResolvedValue({id:'quarantined-only',status:'QUARANTINED',
      readEnabled:false,publishEnabled:false});
    await mount();await open();await click('Attach scanned private PNG');
    const input=tree.root.findByProps({'data-testid':'private-png-candidate-file'});
    const bytes=Buffer.alloc(64,5),target={files:[{
      type:'image/png',size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer
    }],value:'C:\\fakepath\\synthetic.png'};
    await act(async()=>{input.props.onChange({currentTarget:target});await Promise.resolve();});
    expect(api.uploadCandidate).toHaveBeenCalledWith('center-a','activity-a','draft-a',bytes.toString('base64'));
    expect(output()).toContain('quarantined');
    expect(output()).not.toContain('Publish image');
    expect(target.value).toBe('');
  });
  it('scanner denial on private candidate never claims an approved or stored image',async()=>{
    api.list.mockResolvedValue({items:[draft()],nextCursor:null,hasMore:false});
    api.uploadCandidate.mockRejectedValue(new Error('malware scanner unavailable'));
    await mount();await open();await click('Attach scanned private PNG');
    const input=tree.root.findByProps({'data-testid':'private-png-candidate-file'});
    const bytes=Buffer.alloc(64,8);
    await act(async()=>{input.props.onChange({currentTarget:{
      files:[{type:'image/png',size:64,arrayBuffer:async()=>Uint8Array.from(bytes).buffer}],
      value:'private-filename.png'
    }});await Promise.resolve();});
    expect(output()).toContain('upload was not accepted');
    expect(output()).not.toContain('Encrypted scanned illustration candidate is quarantined');
    expect(output()).not.toContain('private-filename.png');
  });

});
