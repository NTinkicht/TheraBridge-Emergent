// M5-06: real mounted, permission-projected synthetic caseload journey.
const React=require('react');
const {act,create}=require('react-test-renderer');
const h=React.createElement;
const session={activeContext:{type:'center',centerId:'center-a',role:'THERAPIST'},permissions:['center.clinical.read']};
const rows=[
 {id:'child-a',firstName:'Fictional',lastName:'Alex',preferredName:null,services:['SPEECH']},
 {id:'child-b',firstName:'Synthetic',lastName:'Sam',preferredName:null,services:['OT']},
];
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>({
 PageTitle:({title})=>h('h1',null,title),
 Workspace:({children})=>children(session,jest.fn()),
 useLoad:()=>({data:{items:rows},failed:false,reload:jest.fn()}),
}));
jest.mock('@/lib/operations',()=>({
 opsApi:{children:jest.fn()},
}));
const Page=require('../src/app/app/clinical/page').default;
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const ids=()=>tree.root.findAllByType('a').map(x=>x.props.href);
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M5-06 mounted authorized therapist caseload',()=>{
 it('opens only server-projected children, with no clinical release action',async()=>{
  await act(async()=>{tree=create(h(Page));});
  expect(ids()).toEqual(['/app/clinical/child-a','/app/clinical/child-b']);
  const output=JSON.stringify(tree.toJSON());
  expect(output).toContain('Synthetic data only');
  expect(output).toContain('Signing and family release unavailable');
  expect(output).not.toContain('/app/messages');
  expect(get('clinical-caseload-filters')).toBeTruthy();
 });
 it('narrows by name and specialty and never invents records',async()=>{
  await act(async()=>{tree=create(h(Page));});
  await act(async()=>get('clinical-caseload-search').props.onChange({target:{value:'  alex '}}));
  expect(ids()).toEqual(['/app/clinical/child-a']);
  await act(async()=>get('clinical-caseload-service').props.onChange({target:{value:'OT'}}));
  expect(ids()).toEqual([]);
  expect(get('clinical-filter-empty')).toBeTruthy();
 });
});
