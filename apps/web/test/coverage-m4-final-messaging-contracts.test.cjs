// M4-08 message transport boundaries: non-clinical categories, audience scope,
// immutable exact center/thread identity and denial propagation.
const rest={
 get:jest.fn(),send:jest.fn(),publicPost:jest.fn(),remember:jest.fn()
};
jest.mock('@/lib/auth',()=>({rest}));
const {
 messagesApi,categoryLabel,audienceLabel,CATEGORIES,AUDIENCES,NON_CLINICAL_NOTICE
}=require('../src/lib/messages');
const center='fictional-center',thread='fictional-thread';
beforeEach(()=>{
 jest.clearAllMocks();rest.get.mockResolvedValue({items:[],unread:0});
 rest.send.mockResolvedValue({id:thread,status:'OPEN'});
});
describe('real message endpoints remain confined to non-clinical center scope',()=>{
 it('lists all threads with exact center-scoped GET when filter omitted',async()=>{
  await expect(messagesApi.list(center)).resolves.toMatchObject({unread:0});
  expect(rest.get).toHaveBeenCalledWith('/api/centers/'+center+'/threads');
  expect(rest.send).not.toHaveBeenCalled();
 });
 it.each(['OPEN','CLOSED','unread'])('includes explicit status %s without changing tenant',async status=>{
  await messagesApi.list(center,status);
  expect(rest.get).toHaveBeenCalledWith('/api/centers/'+center+'/threads?status='+status);
 });
 it('does not invent an empty filter suffix for a blank status',async()=>{
  await messagesApi.list(center,'');
  expect(rest.get).toHaveBeenCalledWith('/api/centers/'+center+'/threads');
 });
 it('reads one exact thread without implicit administrative permissions',async()=>{
  await messagesApi.thread(center,thread);
  expect(rest.get).toHaveBeenCalledWith('/api/centers/'+center+'/threads/'+thread);
  expect(rest.send).not.toHaveBeenCalled();
 });
 it('opens a non-clinical logistical thread with the chosen guardian audience',async()=>{
  const body={
   childId:'fictional-child',category:'scheduling',subject:'Fictional visit time',
   body:'Please confirm a fictional visit',audience:'GUARDIAN',guardianLinkId:'fictional-link'
  };
  await messagesApi.open(center,body);
  expect(rest.send).toHaveBeenCalledWith('POST','/api/centers/'+center+'/threads',body);
 });
 it('opens specialty-team logistics without fabricating a family/clinical release',async()=>{
  const body={
   childId:'fictional-child',category:'attendance',subject:'Synthetic attendance',
   body:'Fictional reminder',audience:'SPECIALTY',service:'speech'
  };
  await messagesApi.open(center,body);
  expect(rest.send).toHaveBeenCalledWith('POST','/api/centers/'+center+'/threads',body);
 });
 it('replies to exact thread with only user-authored non-clinical text',async()=>{
  await messagesApi.reply(center,thread,'Fictional visit moved to Tuesday');
  expect(rest.send).toHaveBeenCalledWith(
   'POST','/api/centers/'+center+'/threads/'+thread+'/messages',
   {body:'Fictional visit moved to Tuesday'}
  );
 });
 it.each([[true,'close'],[false,'reopen']])('status toggle %s writes exact %s command',async(close,command)=>{
  await messagesApi.setStatus(center,thread,close);
  expect(rest.send).toHaveBeenCalledWith(
   'POST','/api/centers/'+center+'/threads/'+thread+'/'+command
  );
 });
 it('does not relabel rejected thread mutation as a completed message',async()=>{
  rest.send.mockRejectedValueOnce({status:403,code:'CROSS_TENANT'});
  await expect(messagesApi.reply(center,thread,'Fictional reply')).rejects.toMatchObject({status:403});
 });
 it('does not relabel a closed thread conflict as a successful reopen',async()=>{
  rest.send.mockRejectedValueOnce({status:409,code:'THREAD_CLOSED'});
  await expect(messagesApi.setStatus(center,thread,false)).rejects.toMatchObject({status:409});
 });
 it('uses explicit permitted logistical categories and preserves unknown label without inventing category',()=>{
  expect(CATEGORIES.map(c=>c.value)).toEqual(['scheduling','attendance','logistics','other']);
  expect(categoryLabel('scheduling')).toBe('Scheduling');
  expect(categoryLabel('attendance')).toBe('Attendance');
  expect(categoryLabel('unknown-category')).toBe('unknown-category');
 });
 it('labels only three exact audience choices; fallback never grants access',()=>{
  expect(AUDIENCES.map(a=>a.value)).toEqual(['GUARDIAN','CARE_TEAM','SPECIALTY']);
  expect(audienceLabel('GUARDIAN')).toBe('A specific guardian');
  expect(audienceLabel('CARE_TEAM')).toBe('Shared care team');
  expect(audienceLabel('SPECIALTY')).toBe('Specialty team only');
  expect(audienceLabel('UNKNOWN')).toBe('UNKNOWN');
 });
 it('shows nonclinical security warning against health and therapy details',()=>{
  expect(NON_CLINICAL_NOTICE).toContain('scheduling, attendance and everyday logistics');
  expect(NON_CLINICAL_NOTICE).toContain('don’t share health, therapy or progress details');
  expect(NON_CLINICAL_NOTICE).toContain('urgent');
 });
});
