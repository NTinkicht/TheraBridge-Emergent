// M4-08 real source-executing staff/family activity route, scoped search,
// load-more and immutable sample note; child card visuals remain isolated.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockSession,routeError;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,Workspace:({children})=>children(mockSession,routeError),
 SelectField:({value,onChange,testId,options})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/components/clinical/ActivityCard',()=>({
 ActivityCard:({t})=>h('article',{'data-testid':'sample-activity-'+t.id},t.title)
}));
jest.mock('@/components/clinical/TemplateActions',()=>({
 TemplateActions:({template})=>h('aside',{'data-testid':'template-actions-'+template.id},'Synthetic actions')
}));
jest.mock('@/lib/clinical',()=>{
 const real=jest.requireActual('@/lib/clinical');
 return {...real,clinicalApi:{...real.clinicalApi,
  templates:jest.fn(),createTemplate:jest.fn(),family:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const ActivitiesPage=require('../src/app/app/activities/page').default;
const template=(id='template-a')=>({id,title:'Synthetic library activity '+id,
 service:'speech',minutes:10,ageBand:'3-6 years',materials:[],steps:[],safety:[]});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const mount=async()=>act(async()=>{tree=create(h(ActivitiesPage));});
beforeEach(()=>{
 jest.clearAllMocks();for(const k of ['templates','createTemplate','family'])clinicalApi[k].mockReset();
 clinicalApi.templates.mockResolvedValue({items:[template()],hasMore:false,nextOffset:null});
 clinicalApi.createTemplate.mockResolvedValue({id:'created'});
 clinicalApi.family.mockResolvedValue({children:[]});
 mockSession={activeContext:{type:'center',centerId:'center-a',role:'THERAPIST'},
 permissions:['center.activities.read','center.activities.manage']};
 routeError=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real activity library source scoping and synthetic family safety',()=>{
 it('loads exact center scope and no implicit exclusions',async()=>{
  await mount();
  expect(clinicalApi.templates).toHaveBeenCalledWith('center-a',{
   search:'',service:undefined,ownership:'all',limit:100
  });
  expect(get('activities-title')).toBeTruthy();
  expect(get('sample-activity-template-a')).toBeTruthy();
 });
 it('does not expose editing actions without management authorization',async()=>{
  mockSession.permissions=['center.activities.read'];
  await mount();
  expect(find('template-form-toggle')).toHaveLength(0);
  expect(find('template-actions-template-a')).toHaveLength(0);
  expect(get('sample-activity-template-a')).toBeTruthy();
 });
 it('trims keyword and separately filters specialty and creator ownership',async()=>{
  await mount();
  await change('activities-search','  turn-taking  ');
  await change('activities-specialty-filter','speech');
  await change('activities-ownership-filter','mine');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('center-a',
   {search:'turn-taking',service:'speech',ownership:'mine',limit:100});
  expect(get('activities-clear-filters')).toBeTruthy();
 });
 it('clears all filters without changing source center',async()=>{
  await mount();
  await change('activities-search','synthetic');
  await change('activities-specialty-filter','speech');
  await click('activities-clear-filters');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('center-a',{
   search:'',service:undefined,ownership:'all',limit:100
  });
 });
 it('loads second page and deduplicates overlapping activity ids',async()=>{
  clinicalApi.templates.mockResolvedValueOnce({items:[template('a')],hasMore:true,nextOffset:100})
   .mockResolvedValueOnce({items:[template('a'),template('b')],hasMore:false,nextOffset:null});
  await mount();await click('activities-load-more');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('center-a',{
   offset:100,limit:100,search:'',service:undefined,ownership:'all'
  });
  expect(find('sample-activity-a')).toHaveLength(1);
  expect(find('sample-activity-b')).toHaveLength(1);
  expect(find('activities-load-more')).toHaveLength(0);
 });
 it('preserves first-page evidence on failing second page and retries safely',async()=>{
  clinicalApi.templates.mockResolvedValueOnce({items:[template('a')],hasMore:true,nextOffset:100})
   .mockRejectedValueOnce(new Error('Synthetic timeout'))
   .mockResolvedValueOnce({items:[template('b')],hasMore:false,nextOffset:null});
  await mount();await click('activities-load-more');
  expect(get('sample-activity-a')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('More activities could not be loaded');
  await click('activities-load-more');
  expect(get('sample-activity-b')).toBeTruthy();
 });
 it('validates and serializes multiline activity materials, steps and safety before save',async()=>{
  await mount();await click('template-form-toggle');
  await change('template-title','Fictional therapeutic turn-taking');
  await change('template-minutes','25');
  await change('template-materials',' paper \n \n cards ');
  await change('template-steps',' first\n second ');
  await change('template-safety',' adult supervision ');
  await click('template-save');
  expect(clinicalApi.createTemplate).toHaveBeenCalledWith('center-a',
   expect.objectContaining({title:'Fictional therapeutic turn-taking',minutes:25,
    materials:['paper','cards'],steps:['first','second'],safety:['adult supervision']}));
  expect(get('template-saved')).toBeTruthy();
  expect(find('template-form')).toHaveLength(0);
 });
 it('shows rejected create error without claiming library write',async()=>{
  clinicalApi.createTemplate.mockRejectedValue({status:422,message:'Synthetic invalid template'});
  await mount();await click('template-form-toggle');
  await change('template-title','Synthetic invalid');
  await click('template-save');
  expect(get('template-error')).toBeTruthy();
  expect(find('template-saved')).toHaveLength(0);
 });
 it('renders family samples with explicit no-private-plan release notice',async()=>{
  mockSession.permissions=['family.activities.read'];
  clinicalApi.family.mockResolvedValue({children:[{
   id:'child-a',name:'Fictional Alex',activities:[template('family-a')]
  }]});
  await mount();
  expect(clinicalApi.family).toHaveBeenCalledWith('center-a');
  expect(get('family-activities-sample-note')).toBeTruthy();
  expect(get('family-activities-child-child-a')).toBeTruthy();
  expect(get('sample-activity-family-a')).toBeTruthy();
  expect(find('template-form-toggle')).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain('sharing plans is switched off');
 });
 it('renders a family missing-child state without revealing other users activities',async()=>{
  mockSession.permissions=['family.activities.read'];
  await mount();
  expect(get('family-activities-empty')).toBeTruthy();
  expect(find('activities-list')).toHaveLength(0);
 });
});
