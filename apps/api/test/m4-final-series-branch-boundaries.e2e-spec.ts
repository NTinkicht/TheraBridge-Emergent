// M4-08 recurrence and scheduling transaction contracts, using production
// SeriesService and synthetic in-memory collaborators. No DB or real child data.
import { expand, SeriesService } from '../src/operations/series.service';

const now=new Date('2026-11-13T12:00:00.000Z');
const dto=()=>({
 childId:'fictional-child',membershipId:'fictional-member',service:'speech',
 startDate:'2026-11-16',untilDate:'2026-11-23',startTime:'10:00',
 durationMinutes:60,weekdays:[1],intervalWeeks:1,room:'Synthetic room'
});
const make=()=>{
 const tx:any={
  center:{findUniqueOrThrow:jest.fn().mockResolvedValue({timezone:'UTC'})},
  appointmentSeries:{
   create:jest.fn().mockResolvedValue({id:'fictional-series'}),
   findFirst:jest.fn(),findMany:jest.fn(),
   update:jest.fn().mockResolvedValue({}),
  },
  appointment:{
   createMany:jest.fn().mockResolvedValue({count:2}),
   findMany:jest.fn().mockResolvedValue([]),
   updateMany:jest.fn().mockResolvedValue({count:1}),
   count:jest.fn().mockResolvedValue(0),
  },
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})},
  $executeRaw:jest.fn().mockResolvedValue(1),
 };
 const db:any={
  $transaction:jest.fn((fn:any)=>fn(tx)),
  appointmentSeries:{findFirst:jest.fn()},
  appointment:{findMany:jest.fn()},
 };
 const trial:any={now:jest.fn(()=>now),assertWritable:jest.fn().mockResolvedValue(undefined)};
 const schedule:any={
  assertAssigned:jest.fn().mockResolvedValue(undefined),
  clashesForSlots:jest.fn().mockResolvedValue([]),
  view:jest.fn().mockResolvedValue([]),
 };
 const notices:any={changed:jest.fn().mockResolvedValue(undefined)};
 const audit:any={record:jest.fn().mockResolvedValue(undefined)};
 return {service:new SeriesService(db,trial,schedule,notices,audit),tx,db,trial,schedule,notices,audit};
};
describe('M4-08 real recurrence expansion preserves date and count boundaries',()=>{
 it('generates exact weekly dates with inclusive until date',()=>{
  expect(expand('2026-11-16','2026-11-30',[1],1)).toEqual(['2026-11-16','2026-11-23','2026-11-30']);
 });
 it('skips alternate ISO weeks without drifting into wrong weekday',()=>{
  expect(expand('2026-11-16','2026-12-01',[1,3],2))
    .toEqual(['2026-11-16','2026-11-18','2026-11-30']);
 });
 it('honors explicit visit count before end date',()=>{
  expect(expand('2026-11-16','2026-12-28',[1,3],1,2))
    .toEqual(['2026-11-16','2026-11-18']);
 });
 it('never schedules a weekday that was not selected',()=>{
  expect(expand('2026-11-16','2026-11-23',[],1)).toEqual([]);
 });
 it('never schedules a visit beyond a reversed end date',()=>{
  expect(expand('2026-11-24','2026-11-16',[1],1)).toEqual([]);
 });
});
describe('M4-08 recurrence creation protects transactional scheduling',()=>{
 it('requires explicit end date or visit count before accessing storage',async()=>{
  const {service,db}=make();
  await expect(service.create('center','actor',{...dto(),untilDate:undefined} as any)).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects an end date earlier than the start',async()=>{
  const {service,db}=make();
  await expect(service.create('center','actor',{...dto(),untilDate:'2026-11-15'} as any)).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects a series spanning more than 26 weeks',async()=>{
  const {service,db}=make();
  await expect(service.create('center','actor',{...dto(),untilDate:'2027-07-01'} as any)).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('refuses a center-local start date already in the past',async()=>{
  const {service,tx}=make();
  await expect(service.create('center','actor',{...dto(),startDate:'2026-11-10',untilDate:'2026-11-24'} as any)).rejects.toMatchObject({status:422});
  expect(tx.appointmentSeries.create).not.toHaveBeenCalled();
 });
 it('rejects recurrence with no matching selected weekday',async()=>{
  const {service,tx}=make();
  await expect(service.create('center','actor',{...dto(),startDate:'2026-11-16',untilDate:'2026-11-17',weekdays:[5]} as any)).rejects.toMatchObject({status:422});
  expect(tx.appointment.createMany).not.toHaveBeenCalled();
 });
 it('never writes partial visits when an unskippable conflict exists',async()=>{
  const {service,tx,schedule,audit}=make();
  schedule.clashesForSlots.mockResolvedValue(['Fictional clinician clash',null]);
  await expect(service.create('center','actor',dto() as any)).rejects.toMatchObject({status:409});
  expect(tx.appointmentSeries.create).not.toHaveBeenCalled();
  expect(tx.appointment.createMany).not.toHaveBeenCalled();
  expect(audit.record).not.toHaveBeenCalled();
 });
 it('also refuses to create an entirely conflicting series when skipConflicts is true',async()=>{
  const {service,tx,schedule}=make();
  schedule.clashesForSlots.mockResolvedValue(['conflict A','conflict B']);
  await expect(service.create('center','actor',{...dto(),skipConflicts:true} as any)).rejects.toMatchObject({status:409});
  expect(tx.appointmentSeries.create).not.toHaveBeenCalled();
 });
 it('allows explicitly skipped conflicting visits while persisting only free dates and audit evidence',async()=>{
  const {service,tx,schedule,audit}=make();
  schedule.clashesForSlots.mockResolvedValue(['Synthetic conflict',null]);
  const result=await service.create('center','actor',{...dto(),skipConflicts:true} as any);
  expect(result).toEqual({id:'fictional-series',created:1,skipped:[{date:'2026-11-16',reason:'Synthetic conflict'}]});
  expect(tx.appointment.createMany.mock.calls[0][0].data).toHaveLength(1);
  expect(tx.appointment.createMany.mock.calls[0][0].data[0].occurrenceDate.toISOString().slice(0,10)).toBe('2026-11-23');
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
 it('schedules both visits and records one audit event when there are no conflicts',async()=>{
  const {service,tx,schedule,audit}=make();
  schedule.clashesForSlots.mockResolvedValue([null,null]);
  const result=await service.create('center','actor',dto() as any);
  expect(result.created).toBe(2);
  expect(result.skipped).toEqual([]);
  expect(tx.appointment.createMany.mock.calls[0][0].data).toHaveLength(2);
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
});
describe('M4-08 series read/update/cancel cannot bypass center or lifecycle constraints',()=>{
 it('denies missing series detail without leaking other center appointments',async()=>{
  const {service,db}=make();
  await expect(service.detail('center',{role:'THERAPIST',membershipId:'member'} as any,'absent')).rejects.toMatchObject({status:404});
  expect(db.appointmentSeries.findFirst.mock.calls[0][0].where).toMatchObject({id:'absent',centerId:'center',membershipId:'member'});
  expect(db.appointment.findMany).not.toHaveBeenCalled();
 });
 it('returns only server-scoped series and transformed occurrences to the allowed reader',async()=>{
  const {service,db,schedule}=make();
  const row={id:'series',childId:'child',membershipId:'member',service:'speech',room:null,
   startTime:'10:00',durationMin:60,weekdays:[1],intervalWeeks:1,status:'ACTIVE',version:2,
   startDate:new Date('2026-11-16T00:00:00Z'),untilDate:new Date('2026-11-23T00:00:00Z')};
  db.appointmentSeries.findFirst.mockResolvedValue(row);
  db.appointment.findMany.mockResolvedValue([{id:'synthetic-visit'}]);
  schedule.view.mockResolvedValue([{id:'sanitized-visit'}]);
  const result=await service.detail('center',{role:'COORDINATOR'} as any,'series');
  expect(result.occurrences).toEqual([{id:'sanitized-visit'}]);
  expect(db.appointmentSeries.findFirst.mock.calls[0][0].where).toEqual({id:'series',centerId:'center'});
 });
 it('refuses updates to missing, ended, or stale-version series before any appointment write',async()=>{
  for(const record of [null,{status:'ENDED',version:2},{status:'ACTIVE',version:3}]){
   const {service,tx}=make();
   tx.appointmentSeries.findFirst.mockResolvedValue(record);
   await expect(service.update('center','actor','series',{fromDate:'2026-11-16',version:2} as any)).rejects.toBeDefined();
   expect(tx.appointment.updateMany).not.toHaveBeenCalled();
   expect(tx.$executeRaw).not.toHaveBeenCalled();
  }
 });
 it('refuses cancellation of missing, already ended, or empty future series',async()=>{
  for(const record of [null,{status:'ENDED'},{status:'ACTIVE'}]){
   const {service,tx,audit}=make();
   tx.appointmentSeries.findFirst.mockResolvedValue(record);
   await expect(service.cancel('center','actor','series',{fromDate:'2026-11-16',reason:'Synthetic'} as any)).rejects.toBeDefined();
   expect(tx.appointment.updateMany).not.toHaveBeenCalled();
   expect(audit.record).not.toHaveBeenCalled();
  }
 });
});

describe('M4-08 cancellation keeps series boundaries and remaining-visit lifecycle consistent', () => {
  const activeSeries = {status:'ACTIVE', startDate:new Date('2026-11-16T00:00:00.000Z'), membershipId:'fictional-member', childId:'fictional-child'};
  const visit = {id:'synthetic-appointment', startsAt:new Date('2026-11-23T10:00:00.000Z')};

  it('clamps the cancelled-series end date to its original start and ends a series with no remaining future visits', async () => {
    const {service,tx,notices}=make();
    tx.appointmentSeries.findFirst.mockResolvedValue(activeSeries);
    tx.appointment.findMany.mockResolvedValue([visit]);
    tx.appointment.count.mockResolvedValue(0);
    const result=await service.cancel('center','actor','series',{fromDate:'2026-11-16',reason:'Synthetic cancellation'} as any);
    expect(result).toEqual({cancelled:1});
    expect(tx.appointmentSeries.update.mock.calls[0][0].data).toMatchObject({status:'ENDED',version:{increment:1}});
    expect(tx.appointmentSeries.update.mock.calls[0][0].data.untilDate.toISOString().slice(0,10)).toBe('2026-11-16');
    expect(tx.appointment.updateMany.mock.calls[0][0].where).toEqual({centerId:'center',id:{in:['synthetic-appointment']}});
    expect(notices.changed).toHaveBeenCalledWith([{id:visit.id,before:visit.startsAt}],'cancelled');
  });

  it('retains ACTIVE status and truncates untilDate when other future appointments survive', async () => {
    const {service,tx,notices}=make();
    tx.appointmentSeries.findFirst.mockResolvedValue(activeSeries);
    tx.appointment.findMany.mockResolvedValue([visit]);
    tx.appointment.count.mockResolvedValue(2);
    const result=await service.cancel('center','actor','series',{fromDate:'2026-11-23',reason:'Synthetic partial cancellation'} as any);
    expect(result).toEqual({cancelled:1});
    const updated=tx.appointmentSeries.update.mock.calls[0][0].data;
    expect(updated.status).toBeUndefined();
    expect(updated.untilDate.toISOString().slice(0,10)).toBe('2026-11-22');
    expect(updated.version).toEqual({increment:1});
    expect(notices.changed).toHaveBeenCalledTimes(1);
  });
});
