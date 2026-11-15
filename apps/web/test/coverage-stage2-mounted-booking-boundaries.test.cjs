// Stage 2 scheduling: real BookDialog mutations with mocked synthetic API I/O.
// Exercises authorized assignment choices, series conflicts and recovery.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,title,children,footer,testId})=>open?
 h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/components/operations/RepeatFields',()=>{
 const actual=jest.requireActual('@/components/operations/RepeatFields');
 return {...actual,RepeatFields:({value,onChange})=>h('div',null,
  h('button',{'data-testid':'repeat-weekly',onClick:()=>onChange({
   ...value,mode:'weekly',weekdays:[1,3],end:'count',count:'4'
  })},'Synthetic weekly'),
  h('button',{'data-testid':'repeat-no-days',onClick:()=>onChange({
   ...value,mode:'weekly',weekdays:[],end:'count',count:'4'
  })},'Synthetic invalid recurrence'),
  h('button',{'data-testid':'repeat-until',onClick:()=>onChange({
   ...value,mode:'biweekly',weekdays:[1],end:'until',until:'2035-12-30'
  })},'Synthetic biweekly until'))};
});
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,
  children:jest.fn(),child:jest.fn(),book:jest.fn(),
  createSeries:jest.fn(),reschedule:jest.fn()}};
});
const {opsApi,setCenterTz}=require('../src/lib/operations');
const {ApiError}=require('../src/lib/api');
const {BookDialog}=require('../src/components/operations/BookDialog');
const person={id:'child-fictional',firstName:'Alex',lastName:'Fictional',preferredName:'Alex'};
const assignment=(extra={})=>({
 id:'assign-1',membershipId:'clinician-1',service:'speech',therapist:'Leila Fictional',
 isLead:true,endedAt:null,...extra
});
const oldVisit=(more={})=>({
 id:'appt-old',child:'Alex',childId:'child-fictional',membershipId:'clinician-1',
 service:'speech',startsAt:'2035-12-15T09:00:00.000Z',endsAt:'2035-12-15T09:45:00.000Z',
 status:'SCHEDULED',version:7,room:'Fictional room',seriesId:'series-a',...more
});
let tree,done,closed,errors;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const json=()=>JSON.stringify(tree.toJSON());
const mount=async(opts={})=>act(async()=>{tree=create(h(BookDialog,{
 centerId:'center-a',open:true,onClose:closed,onDone:done,onError:errors,
 initial:{date:'2035-12-15',start:'09:00'},childId:'child-fictional',...opts
}));});
beforeEach(()=>{
 setCenterTz('Asia/Dubai');
 jest.clearAllMocks();
 for(const k of ['children','child','book','createSeries','reschedule'])opsApi[k].mockReset();
 opsApi.children.mockResolvedValue({items:[person]});
 opsApi.child.mockResolvedValue({assignments:[assignment()]});
 opsApi.book.mockResolvedValue({id:'booked'});
 opsApi.createSeries.mockResolvedValue({created:4,skipped:[]});
 opsApi.reschedule.mockResolvedValue({});
 done=jest.fn();closed=jest.fn();errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real booking dialog source-bound scheduling controls',()=>{
 it('loads child-scoped assignments and books a single visit without invented clinician',async()=>{
  await mount();
  expect(opsApi.children).toHaveBeenCalledWith('center-a',{});
  expect(opsApi.child).toHaveBeenCalledWith('center-a','child-fictional');
  expect(get('book-service-select').props.value).toBe('speech');
  expect(get('book-therapist-select').props.value).toBe('clinician-1');
  await click('book-save');
  expect(opsApi.book).toHaveBeenCalledWith('center-a',expect.objectContaining({
   childId:'child-fictional',service:'speech',membershipId:'clinician-1'
  }));
  expect(opsApi.createSeries).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledWith('Appointment booked.');
 });
 it('does not allow an unassigned child to be booked',async()=>{
  opsApi.child.mockResolvedValue({assignments:[]});
  await mount();await click('book-save');
  expect(find('book-no-team')).toHaveLength(1);
  expect(find('book-error')).toHaveLength(1);
  expect(opsApi.book).not.toHaveBeenCalled();
 });
 it('excludes ended therapists and selects the active lead for the service',async()=>{
  opsApi.child.mockResolvedValue({assignments:[
   assignment({id:'ended',membershipId:'ended-clinician',endedAt:'2020-01-01'}),
   assignment({id:'active',membershipId:'clinician-active',therapist:'Active clinician'})
  ]});
  await mount();
  const entries=get('book-therapist-select').findAllByType('option')
   .map(x=>x.props.value);
  expect(entries).not.toContain('ended-clinician');
  expect(entries).toContain('clinician-active');
  await click('book-save');
  expect(opsApi.book).toHaveBeenCalledWith('center-a',
   expect.objectContaining({membershipId:'clinician-active'}));
 });
 it('blocks a repeat series with zero selected weekdays before network mutation',async()=>{
  await mount();await click('repeat-no-days');await click('book-save');
  expect(json()).toContain('Choose at least one day');
  expect(opsApi.createSeries).not.toHaveBeenCalled();
 });
 it('builds recurring weekly visits from exact selected child, service and assignments',async()=>{
  await mount();await click('repeat-weekly');await click('book-save');
  expect(opsApi.createSeries).toHaveBeenCalledWith('center-a',expect.objectContaining({
   childId:'child-fictional',membershipId:'clinician-1',service:'speech',
   weekdays:[1,3],intervalWeeks:1,count:4,skipConflicts:false
  }));
  expect(done).toHaveBeenCalledWith('4 repeating visits booked.');
 });
 it('uses until-date rather than count for biweekly recurrence',async()=>{
  await mount();await click('repeat-until');await click('book-save');
  const body=opsApi.createSeries.mock.calls[0][1];
  expect(body).toMatchObject({weekdays:[1],intervalWeeks:2,untilDate:'2035-12-30'});
  expect(body).not.toHaveProperty('count');
 });
 it('requires explicit conflict review before skipping just conflicting dates',async()=>{
  opsApi.createSeries.mockRejectedValueOnce(new ApiError(409,'Synthetic collision',{
   conflicts:[{date:'2035-12-17',reason:'Room already booked'}]
  })).mockResolvedValueOnce({created:3,skipped:[{date:'2035-12-17'}]});
  await mount();await click('repeat-weekly');await click('book-save');
  expect(find('book-clashes')).toHaveLength(1);
  expect(opsApi.createSeries.mock.calls[0][1].skipConflicts).toBe(false);
  expect(done).not.toHaveBeenCalled();
  await click('book-skip-clashes');
  expect(opsApi.createSeries.mock.calls[1][1].skipConflicts).toBe(true);
  expect(done).toHaveBeenCalledWith('3 repeating visits booked, 1 skipped because of clashes.');
 });
 it('moves only the chosen visit using optimistic version without rebooking series',async()=>{
  await mount({editing:oldVisit()});
  expect(opsApi.child).not.toHaveBeenCalled();
  await change('book-start-input','13:30');
  await click('book-save');
  expect(opsApi.reschedule).toHaveBeenCalledWith('center-a','appt-old',
   expect.objectContaining({version:7,room:'Fictional room'}));
  expect(opsApi.book).not.toHaveBeenCalled();
  expect(opsApi.createSeries).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledWith('Visit moved. The rest of the series is unchanged.');
 });
 it('retains the booking form and allows retry after a real API validation error',async()=>{
  opsApi.book.mockRejectedValueOnce(new ApiError(422,'Synthetic validation rejected'))
   .mockResolvedValueOnce({});
  await mount();await change('book-room-input','Fictional Room C');
  await click('book-save');
  expect(json()).toContain('Synthetic validation rejected');
  expect(done).not.toHaveBeenCalled();
  await click('book-save');
  expect(opsApi.book).toHaveBeenCalledTimes(2);
  expect(opsApi.book.mock.calls[1][1].room).toBe('Fictional Room C');
  expect(done).toHaveBeenCalledWith('Appointment booked.');
 });
});


describe('M4-08 90% real booking conditional error/assignment cases',()=>{
 it('closed booking modal does not query a private child directory',async()=>{
  await mount({open:false});
  expect(find('book-dialog')).toHaveLength(0);
  expect(opsApi.children).not.toHaveBeenCalled();
  expect(opsApi.child).not.toHaveBeenCalled();
 });
 it('calendar-provided initial slot uses exact date and time rather than wall-clock guess',async()=>{
  await mount({initial:{date:'2035-12-16',start:'10:15'}});
  expect(get('book-date-input').props.value).toBe('2035-12-16');
  expect(get('book-start-input').props.value).toBe('10:15');
 });
 it('no initial child cannot book until explicit child assignment selection',async()=>{
  await mount({childId:undefined});
  expect(get('book-child-select').props.value).toBe('');
  await click('book-save');
  expect(get('book-error')).toBeTruthy();
  expect(opsApi.book).not.toHaveBeenCalled();
 });
 it('failed center child listing surfaces failure without inventing available children',async()=>{
  opsApi.children.mockRejectedValueOnce(new ApiError(403,'Fictional directory denied'));
  await mount({childId:undefined});
  expect(get('book-error')).toBeTruthy();
  expect(get('book-child-select').findAllByType('option').map(x=>x.props.value)).toEqual(['']);
  expect(opsApi.book).not.toHaveBeenCalled();
 });
 it('failed assignment lookup does not preserve other family therapist options',async()=>{
  opsApi.child.mockRejectedValueOnce(new ApiError(403,'Fictional assignments changed'));
  await mount();
  expect(get('book-error')).toBeTruthy();
  expect(get('book-therapist-select').findAllByType('option').map(x=>x.props.value)).toEqual(['']);
 });
 it('two assigned specialties require explicit specialty choice to avoid accidental cross-service booking',async()=>{
  opsApi.child.mockResolvedValueOnce({assignments:[
   assignment({membershipId:'speech-a',service:'speech',isLead:false}),
   assignment({membershipId:'ot-a',service:'occupational',isLead:true})
  ]});
  await mount();
  expect(get('book-service-select').props.value).toBe('');
  expect(get('book-therapist-select').props.value).toBe('');
  await click('book-save');
  expect(opsApi.book).not.toHaveBeenCalled();
  await change('book-service-select','occupational');
  expect(get('book-therapist-select').props.value).toBe('ot-a');
  await click('book-save');
  expect(opsApi.book.mock.calls[0][1]).toMatchObject({
   membershipId:'ot-a',service:'occupational'
  });
 });
 it('explicit second clinician selection preserves only that assigned membership',async()=>{
  opsApi.child.mockResolvedValueOnce({assignments:[
   assignment({membershipId:'speech-lead',isLead:true}),
   assignment({membershipId:'speech-second',isLead:false})
  ]});
  await mount();
  await change('book-therapist-select','speech-second');
  await click('book-save');
  expect(opsApi.book.mock.calls[0][1].membershipId).toBe('speech-second');
 });
 it('changing child resets incompatible specialty and therapist before new server assignments resolve',async()=>{
  opsApi.children.mockResolvedValueOnce({items:[person,{
   id:'child-b',firstName:'Fictional',lastName:'Other',preferredName:null
  }]});
  opsApi.child.mockImplementation(async(_,id)=>({
   assignments:id==='child-b'?[assignment({
    membershipId:'another-staff',service:'occupational',isLead:true
   })]:[assignment()]
  }));
  await mount();
  await change('book-child-select','child-b');
  expect(opsApi.child).toHaveBeenLastCalledWith('center-a','child-b');
  expect(get('book-service-select').props.value).toBe('occupational');
  expect(get('book-therapist-select').props.value).toBe('another-staff');
  await click('book-save');
  expect(opsApi.book.mock.calls[0][1].childId).toBe('child-b');
 });
 it('empty optional room is omitted instead of manufacturing a room reservation',async()=>{
  await mount();await change('book-room-input','');
  await click('book-save');
  expect(opsApi.book.mock.calls[0][1].room).toBeUndefined();
 });
 it('a single recurring visit uses singular wording and no false skip claim',async()=>{
  opsApi.createSeries.mockResolvedValueOnce({created:1,skipped:[]});
  await mount();await click('repeat-weekly');await click('book-save');
  expect(done).toHaveBeenCalledWith('1 repeating visit booked.');
 });
 it('multiple recurring visits correctly report intentional skipped clashes',async()=>{
  opsApi.createSeries.mockResolvedValueOnce({created:2,skipped:[{date:'2035-12-17'},{date:'2035-12-19'}]});
  await mount();await click('repeat-weekly');await click('book-save');
  expect(done).toHaveBeenCalledWith('2 repeating visits booked, 2 skipped because of clashes.');
 });
 it('non-conflict API error does not offer dangerous skip-conflicts override',async()=>{
  opsApi.createSeries.mockRejectedValueOnce(new ApiError(422,'Fictional invalid recurrence'));
  await mount();await click('repeat-weekly');await click('book-save');
  expect(get('book-error')).toBeTruthy();
  expect(find('book-clashes')).toHaveLength(0);
  expect(opsApi.createSeries).toHaveBeenCalledTimes(1);
 });
 it('rescheduling ungrouped appointment cannot silently mutate a different series',async()=>{
  await mount({editing:oldVisit({seriesId:null,room:null})});
  expect(get('book-room-input').props.value).toBe('');
  expect(get('book-length-select').props.value).toBe('45');
  await click('book-save');
  expect(done).toHaveBeenCalledWith('Appointment moved.');
  expect(opsApi.reschedule).toHaveBeenCalledWith('center-a','appt-old',
   expect.objectContaining({room:'',version:7}));
 });
 it('unrecognized service label is displayed literally, never granted a role',()=>{
  const {serviceLabel}=require('../src/components/operations/BookDialog');
  expect(serviceLabel('fictional-unknown-specialty')).toBe('fictional-unknown-specialty');
 });
});
