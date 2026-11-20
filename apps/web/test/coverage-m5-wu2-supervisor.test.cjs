// M5-08: source-bound internal supervisor queue and forbidden family actions.
const fs=require('node:fs');
const path=require('node:path');
const React=require('react');
const {act,create}=require('react-test-renderer');
const h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/lib/reports',()=>{
 const real=jest.requireActual('@/lib/reports');
 return {...real,reportsApi:{...real.reportsApi,reviewQueue:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {SupervisorReviewQueue}=require('../src/components/clinical/SupervisorReviewQueue');
const governance=fs.readFileSync(path.resolve(__dirname,'../src/app/app/governance/page.tsx'),'utf8');
let tree;
const find=id=>tree.root.findAllByProps({'data-testid':id});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.clearAllMocks();});
describe('M5-08 internal supervisor review workspaces',()=>{
 it('renders only server-provided metadata and opens authorized report details without family messaging',async()=>{
  reportsApi.reviewQueue.mockResolvedValue({items:[{id:'draft-r1',title:'Internal draft',childName:'Synthetic Sam',service:'SPEECH',author:'Fictional Clinician',periodStart:'2026-09-01',periodEnd:'2026-09-30'}],page:1,total:1,filteredTotal:1,hasMore:false});
  await act(async()=>{tree=create(h(SupervisorReviewQueue,{centerId:'c1',childId:'kid1',service:'SPEECH',onError:jest.fn()}));});
  expect(reportsApi.reviewQueue).toHaveBeenCalledWith('c1',{childId:'kid1',service:'SPEECH',search:undefined,page:1});
  expect(find('review-queue-preview-draft-r1')).toHaveLength(1);
  expect(tree.root.findByProps({'data-testid':'review-queue-open-draft-r1'}).props.href).toBe('/app/reports/draft-r1');
  const rendered=JSON.stringify(tree.toJSON());
  expect(rendered).toContain('No clinical approval or family release is implied');
  expect(rendered).not.toContain('/app/messages');
  expect(rendered).toContain('Signing and family release disabled');
 });
 it('clears optional search while leaving parent tenant, child and specialty scope unchanged',async()=>{
  reportsApi.reviewQueue.mockResolvedValue({items:[],page:1,total:0,filteredTotal:0,hasMore:false});
  await act(async()=>{tree=create(h(SupervisorReviewQueue,{centerId:'c1',childId:'kid1',service:'OT',onError:jest.fn()}));});
  const search=tree.root.findByProps({'data-testid':'review-queue-search'});
  await act(async()=>search.props.onChange({target:{value:'synthetic'}}));
  expect(find('review-queue-clear-search').length).toBeGreaterThan(0);
  await act(async()=>tree.root.findByProps({'data-testid':'review-queue-clear-search'}).props.onClick());
  expect(find('review-queue-clear-search')).toHaveLength(0);
 });
 it('removes old child and centre review metadata immediately while a new authorized response is pending', async()=>{
  const former={items:[{id:'old-private',title:'Former scoped draft',childName:'Old child',service:'SPEECH',author:'Old author',periodStart:'2099-01-01',periodEnd:'2099-01-02'}],page:1,total:1,filteredTotal:1,hasMore:false};
  const newer={items:[{id:'new-private',title:'New scoped draft',childName:'New child',service:'OT',author:'New author',periodStart:'2099-01-03',periodEnd:'2099-01-04'}],page:1,total:1,filteredTotal:1,hasMore:false};
  let release;
  reportsApi.reviewQueue.mockResolvedValueOnce(former).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  const onError=jest.fn();
  await act(async()=>{tree=create(h(SupervisorReviewQueue,{centerId:'centre-a',childId:'child-a',service:'SPEECH',onError}));});
  expect(JSON.stringify(tree.toJSON())).toContain('Former scoped draft');
  await act(async()=>{tree.update(h(SupervisorReviewQueue,{centerId:'centre-b',childId:'child-b',service:'OT',onError}));});
  expect(JSON.stringify(tree.toJSON())).not.toContain('Former scoped draft');
  expect(find('review-queue-open-old-private')).toHaveLength(0);
  expect(find('review-queue-loading')).toHaveLength(1);
  expect(reportsApi.reviewQueue).toHaveBeenLastCalledWith('centre-b',{childId:'child-b',service:'OT',search:undefined,page:1});
  await act(async()=>{release(newer);});
  expect(JSON.stringify(tree.toJSON())).toContain('New scoped draft');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Former scoped draft');
 });
 it('hides prior-page report links until current server page arrives',async()=>{
  const initial={items:[{id:'page-one',title:'Page one draft',childName:'Demo child',service:'OT',author:'Demo author',periodStart:'2099-01-01',periodEnd:'2099-01-02'}],page:1,total:2,filteredTotal:2,hasMore:true};
  const second={...initial,items:[{...initial.items[0],id:'page-two',title:'Page two draft'}],page:2,hasMore:false};
  let release;
  reportsApi.reviewQueue.mockResolvedValueOnce(initial).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  await act(async()=>{tree=create(h(SupervisorReviewQueue,{centerId:'centre-a',childId:'child-a',service:'OT',onError:jest.fn()}));});
  expect(tree.root.findAllByType('a').filter(node=>node.props.href==='/app/reports/page-one')).toHaveLength(1);
  await act(async()=>{tree.root.findByProps({'data-testid':'review-queue-next'}).props.onClick();});
  expect(tree.root.findAllByType('a').filter(node=>node.props.href==='/app/reports/page-one')).toHaveLength(0);
  expect(find('review-queue-loading')).toHaveLength(1);
  await act(async()=>{release(second);});
  expect(tree.root.findAllByType('a').filter(node=>node.props.href==='/app/reports/page-two')).toHaveLength(1);
  expect(find('review-queue-open-page-one')).toHaveLength(0);
 });
 it('keeps supervisor-only queue button and filtered-out details fail-closed in governance',()=>{
  expect(governance).toContain("supervisor=session.activeContext?.role");
  expect(governance).toContain('const d=items.find(item=>item.id===selected)');
  expect(governance).toContain("d.status==='IN_REVIEW'");
  expect(governance).toContain("['COMMENT','RETURN']");
  expect(governance).toContain('Production clinical signing and release are disabled');
  expect(governance).not.toContain('center.messages.use');
 });
});
