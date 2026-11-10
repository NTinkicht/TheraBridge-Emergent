// M4-08 Stage 2: exercise real appointment action component with synthetic
// scheduling data. API transport is mocked, not the component or its handlers.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...rest})=>h('a',{href,...rest},children)}));
jest.mock('@/components/design/states',()=>{
 const real=jest.requireActual('@/components/design/states');
 return {...real,Dialog:({open,children,footer,title,testId})=>open?
  h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,
  SelectField:({value,onChange,testId,options})=>h('select',{'data-testid':testId,value,
   onChange:e=>onChange(e.target.value)},options.map(o=>h('option',{value:o.value,key:o.value},o.label))),
  ReasonField:({value,onChange,testId})=>h('textarea',{'data-testid':testId,value,
   onChange:e=>onChange(e.target.value)})};
});
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,
  series:jest.fn(),setStatus:jest.fn(),cancelSeries:jest.fn(),updateSeries:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {ApiError}=require('../src/lib/api');
const {AppointmentPanel}=require('../src/components/operations/AppointmentPanel');
const visit=(changes={})=>({
 id:'appt-fictional',childId:'child-fictional',childFull:'Fictional Alex',
 child:'Fictional Alex',service:'speech',therapist:'Leila Fictional',membershipId:'therapist-a',
 startsAt:'2035-12-15T09:00:00.000Z',endsAt:'2035-12-15T09:45:00.000Z',
 status:'SCHEDULED',version:7,room:'Synthetic room',seriesId:null,
 isException:false,reminderSentAt:null,...changes
});
const recurrence=(changes={})=>({
 id:'series-fictional',version:4,status:'ACTIVE',weekdays:[1,3],
 intervalWeeks:1,occurrences:[{status:'SCHEDULED',startsAt:'2035-12-15T09:00:00.000Z'}],
 ...changes
});
let tree,done,moved,closed,errored;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>{get(id).props.onChange({target:{value}});});
const render=async(a=visit(),props={})=>act(async()=>{tree=create(h(AppointmentPanel,{
 centerId:'center-a',appt:a,manage:true,mine:true,canOpenClinical:true,
 onClose:closed,onMove:moved,onDone:done,onError:errored,...props
}));});
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();
 for(const k of ['series','setStatus','cancelSeries','updateSeries'])opsApi[k].mockReset();
 done=jest.fn();moved=jest.fn();closed=jest.fn();errored=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted appointment authorization, recurrence and conflict actions',()=>{
 it('hides all state-changing controls when viewing without management rights',async()=>{
  await render(visit(),{manage:false,mine:false,canOpenClinical:false});
  expect(find('appt-cancel')).toHaveLength(0);
  expect(find('appt-move')).toHaveLength(0);
  expect(find('appt-attended')).toHaveLength(0);
  expect(find('appt-noshow')).toHaveLength(0);
  expect(html()).not.toContain('Open child session workspace');
  await click('appt-close');expect(closed).toHaveBeenCalledTimes(1);
  expect(opsApi.setStatus).not.toHaveBeenCalled();
 });
 it('only permits moving future scheduled visit by manager',async()=>{
  const appt=visit();await render(appt);
  await click('appt-move');
  expect(moved).toHaveBeenCalledWith(appt);
  expect(opsApi.setStatus).not.toHaveBeenCalled();
 });
 it('requires meaningful cancellation reason and sends trimmed exact scope',async()=>{
  opsApi.setStatus.mockResolvedValue({});
  await render();await click('appt-cancel');
  await change('appt-reason',' x ');
  await click('appt-cancel-confirm');
  expect(opsApi.setStatus).not.toHaveBeenCalled();
  expect(html()).toContain('at least 3 characters');
  await change('appt-reason','  Parent requested reschedule  ');
  await click('appt-cancel-confirm');
  expect(opsApi.setStatus).toHaveBeenCalledWith('center-a','appt-fictional','CANCELLED','Parent requested reschedule');
  expect(done).toHaveBeenCalledWith('Visit cancelled.');
 });
 it('does not report success when cancelling fails and keeps retry available',async()=>{
  opsApi.setStatus.mockRejectedValueOnce(new ApiError(409,'Schedule was changed'))
   .mockResolvedValueOnce({});
  await render();await click('appt-cancel');
  await change('appt-reason','Fictional family request');
  await click('appt-cancel-confirm');
  expect(find('appt-error')).toHaveLength(1);
  expect(done).not.toHaveBeenCalled();
  await click('appt-cancel-confirm');
  expect(opsApi.setStatus).toHaveBeenCalledTimes(2);
  expect(done).toHaveBeenCalledWith('Visit cancelled.');
 });
 it('records attendance only for own already-started scheduled visit',async()=>{
  opsApi.setStatus.mockResolvedValue({});
  await render(visit({startsAt:'2020-12-15T09:00:00.000Z',endsAt:'2020-12-15T09:45:00.000Z'}));
  expect(find('appt-attended')).toHaveLength(1);
  expect(find('appt-move')).toHaveLength(0);
  await click('appt-attended');
  expect(opsApi.setStatus).toHaveBeenCalledWith('center-a','appt-fictional','COMPLETED');
  expect(done).toHaveBeenCalledWith('Marked as attended.');
 });
 it('prevents no-show mutation without an explanatory reason',async()=>{
  opsApi.setStatus.mockResolvedValue({});
  await render(visit({startsAt:'2020-12-15T09:00:00.000Z',endsAt:'2020-12-15T09:45:00.000Z'}));
  await click('appt-noshow');await click('appt-noshow-confirm');
  expect(opsApi.setStatus).not.toHaveBeenCalled();
  await change('appt-reason','  Synthetic no-show  ');
  await click('appt-noshow-confirm');
  expect(opsApi.setStatus).toHaveBeenCalledWith('center-a','appt-fictional','NO_SHOW','Synthetic no-show');
 });
 it('fetches series and uses exact optimistic version for this-and-following mutation',async()=>{
  opsApi.series.mockResolvedValue(recurrence());
  opsApi.updateSeries.mockResolvedValue({});
  await render(visit({seriesId:'series-fictional'}));
  expect(opsApi.series).toHaveBeenCalledWith('center-a','series-fictional');
  expect(find('series-actions')).toHaveLength(1);
  await click('series-edit');
  await change('series-edit-start','13:30');
  await change('series-edit-length','60');
  await click('series-edit-confirm');
  expect(opsApi.updateSeries).toHaveBeenCalledWith('center-a','series-fictional',
   expect.objectContaining({startTime:'13:30',durationMinutes:60,version:4}));
  expect(opsApi.updateSeries.mock.calls[0][2].fromDate).toMatch(/^2035-12-1[45]$/);
  expect(done).toHaveBeenCalledWith('This and following visits updated.');
 });
 it('supports series cancellation with reason and blocks accidental bulk action',async()=>{
  opsApi.series.mockResolvedValue(recurrence({intervalWeeks:2}));
  opsApi.cancelSeries.mockResolvedValue({});
  await render(visit({seriesId:'series-fictional'}));
  expect(html()).toContain('Every 2 weeks');
  await click('series-cancel');await click('series-cancel-confirm');
  expect(opsApi.cancelSeries).not.toHaveBeenCalled();
  await change('appt-reason','  Synthetic staffing change  ');
  await click('series-cancel-confirm');
  expect(opsApi.cancelSeries).toHaveBeenCalledWith('center-a','series-fictional',
   expect.stringMatching(/^2035-12-1[45]$/),'Synthetic staffing change');
 });
 it('hides mass-series edit for independently moved exception while keeping cancellation review',async()=>{
  opsApi.series.mockResolvedValue(recurrence());
  await render(visit({seriesId:'series-fictional',isException:true}));
  expect(find('series-edit')).toHaveLength(0);
  expect(find('series-cancel')).toHaveLength(1);
  expect(html()).toContain('this visit was moved on its own');
 });
 it('never offers mutation on cancelled visit, even to a manager',async()=>{
  await render(visit({status:'CANCELLED'}));
  expect(find('appt-cancel')).toHaveLength(0);
  expect(find('appt-move')).toHaveLength(0);
  expect(find('appt-attended')).toHaveLength(0);
  expect(find('appt-close')).toHaveLength(1);
  expect(opsApi.setStatus).not.toHaveBeenCalled();
 });
});
