// M4-08 real mounted booking/rescheduling/recurrence command routing.
// Child/team choices remain strictly scoped to synthetic assigned people.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,children,footer})=>open?
 h('section',{'data-testid':'modal-host'},children,footer):null};
});
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/operations/RepeatFields',()=>({
 RepeatFields:({value,onChange})=>h('div',null,
  h('button',{type:'button','data-testid':'make-weekly-synthetic',
   onClick:()=>onChange({...value,mode:'weekly',weekdays:[2],end:'count',count:'4'})},'Four weekly visits'),
  h('button',{type:'button','data-testid':'make-biweekly-until-synthetic',
   onClick:()=>onChange({...value,mode:'biweekly',weekdays:[1,3],
     end:'until',until:'2026-12-14'})},'Biweekly until date'),
  h('button',{type:'button','data-testid':'make-weekly-empty-synthetic',
   onClick:()=>onChange({...value,mode:'weekly',weekdays:[]})},'No weekdays'))
}));
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,
  children:jest.fn(),child:jest.fn(),book:jest.fn(),
  createSeries:jest.fn(),reschedule:jest.fn()}};
});
const {opsApi,setCenterTz}=require('../src/lib/operations');
const {BookDialog}=require('../src/components/operations/BookDialog');
const {ApiError}=require('../src/lib/api');
let tree=null,onDone,onError,onClose;
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
beforeEach(()=>{
 jest.clearAllMocks();onDone=jest.fn();onError=jest.fn();onClose=jest.fn();
 opsApi.children.mockResolvedValue({items:[
  {id:'kid',firstName:'Alex',lastName:'Fictional',preferredName:'Alex'}
 ]});
 opsApi.child.mockResolvedValue({id:'kid',assignments:[
  {id:'a1',membershipId:'therapist-1',service:'speech',
   therapist:'Fictional Therapist',isLead:true,endedAt:null},
  {id:'a2',membershipId:'therapist-other',service:'ot',
   therapist:'Other Therapist',isLead:true,endedAt:'2026-10-01T10:00:00Z'}
 ]});
 opsApi.book.mockResolvedValue({id:'appointment-1'});
 opsApi.reschedule.mockResolvedValue({id:'appointment-1'});
 opsApi.createSeries.mockResolvedValue({created:4,skipped:[]});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const get=id=>tree.root.findByProps({'data-testid':id});
const choose=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async id=>act(async()=>get(id).props.onClick());
const mount=async extra=>act(async()=>{tree=create(h(BookDialog,{
 centerId:'center-1',open:true,onDone,onError,onClose,
 initial:{date:'2026-11-17',start:'10:00'},...extra
 }));});
describe('M4-08 booking refuses unauthorized/unassigned therapist choices',()=>{
 it('blocks a visit when no child/team is selected and never sends API command',async()=>{
  await mount();
  await click('book-save');
  expect(opsApi.book).not.toHaveBeenCalled();
  expect(get('book-error')).toBeTruthy();
 });
 it('shows missing assigned care team rather than inventing an eligible booking target',async()=>{
  opsApi.child.mockResolvedValue({id:'kid',assignments:[]});
  await mount();
  await choose('book-child-select','kid');
  expect(get('book-no-team')).toBeTruthy();
  expect(get('book-therapist-select').findAllByType('option').map(x=>x.props.value))
   .toEqual(['']);
  await click('book-save');
  expect(opsApi.book).not.toHaveBeenCalled();
 });
 it('reports child-assignment lookup failure without creating an appointment',async()=>{
  opsApi.child.mockRejectedValue(new ApiError(403,'Not assigned to child'));
  await mount();
  await choose('book-child-select','kid');
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({status:403}));
  await click('book-save');
  expect(opsApi.book).not.toHaveBeenCalled();
 });
 it('books an exact selected assigned child and service in center local time',async()=>{
  await mount();
  await choose('book-child-select','kid');
  expect(opsApi.child).toHaveBeenCalledWith('center-1','kid');
  const options=get('book-therapist-select').findAllByType('option').map(x=>x.props.value);
  expect(options).toContain('therapist-1');
  expect(options).not.toContain('therapist-other');
  await click('book-save');
  expect(opsApi.book).toHaveBeenCalledWith('center-1',
   expect.objectContaining({childId:'kid',membershipId:'therapist-1',service:'speech'}));
  const body=opsApi.book.mock.calls[0][1];
  expect(Date.parse(body.endsAt)-Date.parse(body.startsAt)).toBe(45*60000);
  expect(onDone).toHaveBeenCalledWith('Appointment booked.');
 });
 it('books a weekly series only after explicit recurrence choice, never via one-off booking',async()=>{
  await mount();
  await choose('book-child-select','kid');
  await click('make-weekly-synthetic');
  await click('book-save');
  expect(opsApi.book).not.toHaveBeenCalled();
  expect(opsApi.createSeries).toHaveBeenCalledWith('center-1',
   expect.objectContaining({childId:'kid',membershipId:'therapist-1',
    weekdays:[2],count:4,intervalWeeks:1,skipConflicts:false}));
  expect(onDone).toHaveBeenCalledWith('4 repeating visits booked.');
 });
 it('shows server-detected conflicts and retries a series with explicit skip confirmation',async()=>{
  opsApi.createSeries.mockRejectedValueOnce(new ApiError(409,'Synthetic scheduling clash',{
   conflicts:[{date:'2026-11-24',reason:'Fictional room already booked'}]}))
   .mockResolvedValueOnce({created:3,skipped:['2026-11-24']});
  await mount();
  await choose('book-child-select','kid');
  await click('make-weekly-synthetic');
  await click('book-save');
  expect(get('book-clashes')).toBeTruthy();
  expect(get('book-clash-2026-11-24')).toBeTruthy();
  expect(opsApi.createSeries).toHaveBeenCalledWith('center-1',
   expect.objectContaining({skipConflicts:false}));
  await click('book-skip-clashes');
  expect(opsApi.createSeries).toHaveBeenLastCalledWith('center-1',
   expect.objectContaining({skipConflicts:true}));
  expect(onDone).toHaveBeenCalledWith('3 repeating visits booked, 1 skipped because of clashes.');
 });
 it('does not falsely acknowledge booking on an API authorization rejection',async()=>{
  opsApi.book.mockRejectedValue(new ApiError(403,'Synthetic booking denied'));
  await mount();
  await choose('book-child-select','kid');
  await click('book-save');
  expect(onDone).not.toHaveBeenCalled();
  expect(opsApi.book).toHaveBeenCalledTimes(1);
  // The shared error handler owns the user-visible alert in this workflow.
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({status:403}));
 });
 it('rejects recurrence without weekdays instead of silently booking any dates',async()=>{
  await mount();
  await choose('book-child-select','kid');
  await click('make-weekly-empty-synthetic');
  await click('book-save');
  expect(get('book-error')).toBeTruthy();
  expect(opsApi.createSeries).not.toHaveBeenCalled();
 });
 it('preserves alternate-week and explicit-until date semantics in a series command',async()=>{
  await mount();
  await choose('book-child-select','kid');
  await click('make-biweekly-until-synthetic');
  await click('book-save');
  expect(opsApi.createSeries).toHaveBeenCalledWith('center-1',expect.objectContaining({
   childId:'kid',membershipId:'therapist-1',intervalWeeks:2,
   weekdays:[1,3],untilDate:'2026-12-14',skipConflicts:false
  }));
  expect(opsApi.book).not.toHaveBeenCalled();
 });
 it('moves one existing visit without changing sibling series visits',async()=>{
  const editing={id:'appointment-1',childId:'kid',membershipId:'therapist-1',
   service:'speech',child:'Alex',startsAt:'2026-11-17T06:00:00Z',
   endsAt:'2026-11-17T06:45:00Z',room:'Room 1',version:3,seriesId:'series-1'};
  await mount({editing});
  await choose('book-start-input','11:00');
  await click('book-save');
  expect(opsApi.reschedule).toHaveBeenCalledWith('center-1','appointment-1',
   expect.objectContaining({version:3,room:'Room 1'}));
  expect(opsApi.createSeries).not.toHaveBeenCalled();
  expect(onDone).toHaveBeenCalledWith('Visit moved. The rest of the series is unchanged.');
 });
});
