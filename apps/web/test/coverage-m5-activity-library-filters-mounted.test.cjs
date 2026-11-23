// Render and exercise real M5-12 server-scoped filter UI and new-template fields.
// Authorized fictional data only; no published images or guardian permissions.
const React=require('react');
const {act,create}=require('react-test-renderer'),h=React.createElement;
let session,reportError;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,Workspace:({children})=>children(session,reportError),
  SelectField:({value,onChange,testId,options})=>h('select',{
    value,'data-testid':testId,onChange:e=>onChange(e.target.value),
  },options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/components/clinical/ActivityCard',()=>({
 ActivityCard:({t})=>h('article',{'data-testid':'synthetic-card-'+t.id},t.title),
}));
jest.mock('@/components/clinical/TemplateActions',()=>({
 TemplateActions:()=>h('span',{},'Synthetic editor'),
}));
jest.mock('@/components/clinical/ActivityMediaDraftPanel',()=>({
 ActivityMediaDraftPanel:()=>h('span',{},'Private proposal, no release'),
}));
jest.mock('@/lib/clinical',()=>{
 const actual=jest.requireActual('@/lib/clinical');
 return {...actual,clinicalApi:{...actual.clinicalApi,
  templates:jest.fn(),family:jest.fn(),createTemplate:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const ActivitiesPage=require('../src/app/app/activities/page').default;
const record=(id='one')=>({id,title:'Synthetic activity '+id,service:'speech',
 library:'synthetic',version:2,mine:false,ageBand:'sample',minutes:10,
 materials:['cards'],steps:['Choose'],safety:['Adult check'],category:null,skill:null,equipment:[]});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>{get(id).props.onChange({target:{value}});await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(ActivitiesPage));});
beforeEach(()=>{
 jest.resetAllMocks();tree=null;session={activeContext:{type:'center',centerId:'center-a',role:'THERAPIST'},
  permissions:['center.activities.read','center.activities.manage']};
 reportError=jest.fn(e=>{throw e;});
 clinicalApi.templates.mockResolvedValue({items:[record()],hasMore:false,nextOffset:null});
 clinicalApi.family.mockResolvedValue({children:[]});
 clinicalApi.createTemplate.mockResolvedValue({id:'created'});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M5-12 persistent server-side taxonomy filters',()=>{
 it('sends the three exact discovery filters and ownership to the authorized server',async()=>{
  await mount();
  await change('activities-category-filter','  Fine motor  ');
  await change('activities-skill-filter','  Grasping  ');
  await change('activities-equipment-filter','  foam blocks  ');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({category:'Fine motor',skill:'Grasping',equipment:'foam blocks',
    ownership:'all',limit:100}));
  expect(get('activities-clear-filters')).toBeTruthy();
 });
 it('clear-filters resets new metadata fields and source-scoped query',async()=>{
  await mount();
  await change('activities-category-filter','Communication');
  await change('activities-skill-filter','Turn taking');
  await change('activities-equipment-filter','Cards');
  await click('activities-clear-filters');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({search:'',category:'',skill:'',equipment:'',ownership:'all'}));
  expect(get('activities-category-filter').props.value).toBe('');
  expect(get('activities-skill-filter').props.value).toBe('');
  expect(get('activities-equipment-filter').props.value).toBe('');
 });
 it('keeps new filters on further pages and retains per-activity deduplication',async()=>{
  await mount();
  clinicalApi.templates.mockResolvedValueOnce({items:[record('first')],hasMore:true,nextOffset:100});
  await change('activities-category-filter','Speech');
  clinicalApi.templates.mockResolvedValueOnce({items:[record('first'),record('second')],
    hasMore:false,nextOffset:null});
  await click('activities-load-more');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({offset:100,limit:100,category:'Speech',skill:'',equipment:''}));
  expect(find('synthetic-card-first')).toHaveLength(1);
  expect(find('synthetic-card-second')).toHaveLength(1);
 });
 it('creates a non-published template carrying explicit equipment/category/skill',async()=>{
  await mount();await click('template-form-toggle');
  await change('template-title','Synthetic choice work');
  await change('template-category','Communication');
  await change('template-skill','Turn taking');
  const equip=tree.root.findAllByType('textarea').find(x=>x.props.value==='');
  // The first new-template textarea is the equipment multiline input.
  expect(equip).toBeTruthy();
  await act(async()=>equip.props.onChange({target:{value:' Cards \n \n foam '}}));
  await click('template-save');
  expect(clinicalApi.createTemplate).toHaveBeenCalledWith('center-a',
   expect.objectContaining({category:'Communication',skill:'Turn taking',
    equipment:['Cards','foam']}));
  expect(find('template-form')).toHaveLength(0);
 });
 it('never exposes taxonomy editing to an unauthorized family role',async()=>{
  session.permissions=['family.activities.read'];
  await mount();
  expect(find('activities-category-filter')).toHaveLength(0);
  expect(find('template-form-toggle')).toHaveLength(0);
  expect(find('family-activities')).toHaveLength(1);
 });
});
