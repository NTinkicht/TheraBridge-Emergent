// Stage 3: source-execute operational transport contract without external
// network: paths, tenancy, optimistic versions, scoped role revocation and
// recurrence mutations must never cross the specified center boundary.
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,rest:{get:jest.fn(),send:jest.fn()}};
});
const {rest}=require('../src/lib/auth');
const {opsApi,getCenterTz,setCenterTz,zonedDateTimeInputToIso,
 preservedZonedInstant,formatZonedDateTimeInput,addDays,isoWeekday,
 STATUS_LABEL}=require('../src/lib/operations');
beforeEach(()=>{jest.clearAllMocks();
 rest.get.mockResolvedValue({items:[],timezone:'Asia/Dubai',
  center:{timezone:'Asia/Dubai'},hasMore:false,nextOffset:null});
 rest.send.mockResolvedValue({id:'fictional-result'});
 setCenterTz(undefined);
});
afterEach(()=>setCenterTz(undefined));
describe('real source operational API is exact-center scoped and versioned',()=>{
 it('updates center timezone only from acknowledged server dashboard/family data',async()=>{
  await opsApi.dashboard('center-a');
  expect(rest.get).toHaveBeenCalledWith('/api/centers/center-a/dashboard');
  expect(getCenterTz()).toBe('Asia/Dubai');
  setCenterTz(undefined);
  await opsApi.family('center-a');
  expect(rest.get).toHaveBeenCalledWith('/api/centers/center-a/family');
  expect(getCenterTz()).toBe('Asia/Dubai');
 });
 it('encodes authorized therapist filtering and IDs without leaking another center',async()=>{
  await opsApi.therapists('center-a',{service:'speech',search:'A & B',ids:'id-a,id-b',limit:100,offset:100});
  const url=rest.get.mock.calls[0][0];
  expect(url).toMatch(/^\/api\/centers\/center-a\/therapists\?/);
  expect(new URL(url,'https://fictional.invalid').searchParams.get('search')).toBe('A & B');
  expect(new URL(url,'https://fictional.invalid').searchParams.get('ids')).toBe('id-a,id-b');
 });
 it('encodes empty therapist filters with no dangling query string',async()=>{
  await opsApi.therapists('center-a',{search:'',service:''});
  expect(rest.get).toHaveBeenCalledWith('/api/centers/center-a/therapists');
 });
 it('encodes child query and preserves archived versus active state',async()=>{
  await opsApi.children('center-a',{q:'Alex & May',status:'ARCHIVED'});
  const query=rest.get.mock.calls[0][0];
  expect(query).toMatch(/^\/api\/centers\/center-a\/children\?/);
  const parsed=new URL(query,'https://fictional.invalid');
  expect(parsed.searchParams.get('q')).toBe('Alex & May');
  expect(parsed.searchParams.get('status')).toBe('ARCHIVED');
 });
 it('never applies server child timezone until the child endpoint succeeds',async()=>{
  rest.get.mockRejectedValueOnce(new Error('Synthetic denied'));
  await expect(opsApi.child('center-a','child-a')).rejects.toThrow();
  expect(getCenterTz()).toBeUndefined();
  await opsApi.child('center-a','child-a');
  expect(rest.get).toHaveBeenLastCalledWith('/api/centers/center-a/children/child-a');
  expect(getCenterTz()).toBe('Asia/Dubai');
 });
 it('posts scoped guardian invitation/removal with explicit reason, not a global user mutation',async()=>{
  await opsApi.addGuardian('center-a','child-a',{displayName:'Fictional Parent',email:'parent@example.invalid',relationship:'mother',isPrimary:true,invite:true});
  expect(rest.send).toHaveBeenCalledWith('POST','/api/centers/center-a/children/child-a/guardians',
   expect.objectContaining({isPrimary:true}));
  await opsApi.inviteGuardian('center-a','child-a','guardian-a');
  expect(rest.send).toHaveBeenLastCalledWith('POST','/api/centers/center-a/children/child-a/guardians/guardian-a/invite');
  await opsApi.removeGuardian('center-a','child-a','guardian-a','Revoked fictional access');
  expect(rest.send).toHaveBeenLastCalledWith('POST','/api/centers/center-a/children/child-a/guardians/guardian-a/remove',
   {reason:'Revoked fictional access'});
 });
 it('revalidates optimistic child revision on referent designation and update',async()=>{
  await opsApi.designateReferent('center-a','child-a',{membershipId:'therapist-a',version:4,reason:'Synthetic team review'});
  expect(rest.send).toHaveBeenCalledWith('PATCH','/api/centers/center-a/children/child-a/referent',
   {membershipId:'therapist-a',version:4,reason:'Synthetic team review'});
  await opsApi.updateChild('center-a','child-a',{version:4,preferredName:'Fictional Alex'});
  expect(rest.send).toHaveBeenLastCalledWith('PATCH','/api/centers/center-a/children/child-a',
   {version:4,preferredName:'Fictional Alex'});
 });
 it('preserves handover gate state and explicit no-access claim as server-owned',async()=>{
  await opsApi.handovers('center-a',{childId:'child-a',cancelledOffset:20});
  const route=rest.get.mock.calls[0][0];
  expect(new URL(route,'https://fictional.invalid').searchParams.get('cancelledOffset')).toBe('20');
  await opsApi.handoverReadiness('center-a','proposal-a');
  expect(rest.get).toHaveBeenLastCalledWith('/api/centers/center-a/governance/handover-proposals/proposal-a/readiness');
  await opsApi.proposeHandover('center-a',{childId:'child-a',fromMembershipId:'old',toMembershipId:'new',service:'speech',reasonCode:'STAFF_CHANGE'});
  await opsApi.acknowledgeHandover('center-a','proposal-a');
  await opsApi.cancelHandover('center-a','proposal-a');
  expect(rest.send.mock.calls.map(c=>c[1])).toEqual([
   '/api/centers/center-a/governance/handover-proposals',
   '/api/centers/center-a/governance/handover-proposals/proposal-a/acknowledge',
   '/api/centers/center-a/governance/handover-proposals/proposal-a/cancel'
  ]);
 });
 it('scopes appointment range and stores timezone only on confirmed response',async()=>{
  await opsApi.appointments('center-a',{from:'2026-11-11',to:'2026-11-18',
   childId:'child-a',membershipId:'therapist-a'});
  const url=rest.get.mock.calls[0][0];
  const parsed=new URL(url,'https://fictional.invalid');
  expect(parsed.pathname).toBe('/api/centers/center-a/appointments');
  expect(parsed.searchParams.get('childId')).toBe('child-a');
  expect(parsed.searchParams.get('membershipId')).toBe('therapist-a');
  expect(getCenterTz()).toBe('Asia/Dubai');
 });
 it('preserves optimistic version and body on single appointment reschedule',async()=>{
  await opsApi.book('center-a',{childId:'child-a',membershipId:'therapist-a',service:'speech',
   startsAt:'2026-11-10T08:00:00Z',endsAt:'2026-11-10T09:00:00Z'});
  expect(rest.send).toHaveBeenCalledWith('POST','/api/centers/center-a/appointments',expect.any(Object));
  await opsApi.reschedule('center-a','appt-a',{
   startsAt:'2026-11-12T08:00:00Z',endsAt:'2026-11-12T09:00:00Z',version:3
  });
  expect(rest.send).toHaveBeenLastCalledWith('PATCH','/api/centers/center-a/appointments/appt-a',
   expect.objectContaining({version:3}));
 });
 it('sends status reasons conditionally, never includes reason for simple completion',async()=>{
  await opsApi.setStatus('center-a','appt-a','COMPLETED');
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/center-a/appointments/appt-a/status',{status:'COMPLETED'});
  await opsApi.setStatus('center-a','appt-a','CANCELLED','Synthetic reason');
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/center-a/appointments/appt-a/status',{
    status:'CANCELLED',reason:'Synthetic reason'
   });
 });
 it('keeps recurring series updates explicitly versioned and cancellation reasoned',async()=>{
  await opsApi.createSeries('center-a',{childId:'child-a',membershipId:'therapist-a',
   service:'speech',startDate:'2026-11-12',startTime:'11:00',durationMinutes:45,
   weekdays:[4],intervalWeeks:1,count:4,skipConflicts:true});
  expect(rest.send).toHaveBeenCalledWith('POST','/api/centers/center-a/series',
   expect.objectContaining({skipConflicts:true,count:4}));
  await opsApi.series('center-a','series-a');
  expect(rest.get).toHaveBeenCalledWith('/api/centers/center-a/series/series-a');
  await opsApi.updateSeries('center-a','series-a',{
   fromDate:'2026-11-19',startTime:'12:00',version:7});
  expect(rest.send).toHaveBeenLastCalledWith('PATCH',
   '/api/centers/center-a/series/series-a',expect.objectContaining({version:7}));
  await opsApi.cancelSeries('center-a','series-a','2026-11-19','Synthetic schedule changed');
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/center-a/series/series-a/cancel',{
    fromDate:'2026-11-19',reason:'Synthetic schedule changed'
   });
 });
 it('keeps platform trial extension separate from center operational trial route',async()=>{
  await opsApi.platformTrial('center-a');await opsApi.extendTrial('center-a',7,'Synthetic exception');
  expect(rest.get).toHaveBeenCalledWith('/api/platform/centers/center-a/trial');
  expect(rest.send).toHaveBeenCalledWith('POST',
   '/api/platform/centers/center-a/trial/extend',{days:7,reason:'Synthetic exception'});
  await opsApi.setReminders('center-a','child-a',false);
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/center-a/family/preferences',{childId:'child-a',reminders:false});
 });
});
describe('real center-local appointment timezone and DST formatting',()=>{
 it('converts Dubai wall time to exact UTC without a browser timezone assumption',()=>{
  expect(zonedDateTimeInputToIso('2026-11-11T12:30','Asia/Dubai')).toBe('2026-11-11T08:30:00.000Z');
  expect(formatZonedDateTimeInput('2026-11-11T08:30:19Z','Asia/Dubai',true)).toBe('2026-11-11T12:30:19');
 });
 it('refuses unpinned center timezone rather than falling back to browser local time',()=>{
  expect(()=>require('../src/lib/operations').zonedToUtc('2026-11-11','12:30')).toThrow('Center timezone is unavailable');
 });
 it('refuses nonexistent spring-forward care-center times',()=>{
  expect(()=>zonedDateTimeInputToIso('2026-03-08T02:30','America/New_York')).toThrow('does not exist');
 });
 it('preserves the exact old fall-back instant after unchanged edit',()=>{
  const original='2026-11-01T05:30:00Z';
  expect(preservedZonedInstant('2026-11-01T01:30:00',original,'America/New_York')).toBe(original);
 });
 it('rejects malformed date fields and seconds instead of normalizing patient visits',()=>{
  expect(()=>zonedDateTimeInputToIso('invalid','Asia/Dubai')).toThrow();
  expect(()=>zonedDateTimeInputToIso('2026-11-10T12:30:70','Asia/Dubai')).toThrow();
 });
 it('calculates ISO weekday and leap-day transitions without timezone drift',()=>{
  expect(addDays('2028-02-28',1)).toBe('2028-02-29');
  expect(addDays('2028-02-29',1)).toBe('2028-03-01');
  expect(isoWeekday('2026-11-09')).toBe(1);
  expect(STATUS_LABEL.NO_SHOW).toBe('No-show');
 });
});
