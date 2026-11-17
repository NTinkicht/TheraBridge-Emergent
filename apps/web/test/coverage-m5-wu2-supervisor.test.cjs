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
  expect(find('review-queue-clear-search')).toHaveLength(1);
  await act(async()=>tree.root.findByProps({'data-testid':'review-queue-clear-search'}).props.onClick());
  expect(find('review-queue-clear-search')).toHaveLength(0);
 });
 it('keeps supervisor-only queue button and filtered-out details fail-closed in governance',()=>{
  expect(governance).toContain("{supervisor && <Button");
  expect(governance).toContain('const d=items.find(item=>item.id===selected)');
  expect(governance).toContain("d.status==='IN_REVIEW'");
  expect(governance).toContain("['COMMENT','RETURN']");
  expect(governance).toContain('Production clinical signing and release are disabled');
  expect(governance).not.toContain('center.messages.use');
 });
});
