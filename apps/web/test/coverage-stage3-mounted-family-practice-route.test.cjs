// Stage 3: genuine family home-practice route. Source-bound weekly paging,
// day selection, fixed-choice history, gates and one-child scope; every record
// is fictional and must never masquerade as released therapy progress.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,onError;
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children(session,onError)};
});
jest.mock('@/components/practice/ActivityCard',()=>({
 ActivityCard:({a,slots,onRecord,testId})=>h('article',{'data-testid':testId},
  a.title,h('button',{'data-testid':'fake-record-'+a.id,disabled:!onRecord,
    onClick:()=>onRecord?.(slots[0])},'Record fictional response'))
}));
jest.mock('@/components/practice/GuardianPlanRequestPanel',()=>({
 GuardianPlanRequestPanel:({childId})=>h('aside',{'data-testid':'fake-requests-'+childId})}));
jest.mock('@/components/practice/RecordDialog',()=>({
 RecordDialog:({childId,onClose,onRecorded})=>h('section',{'data-testid':'fake-record-dialog'},
  h('p',null,childId),
  h('button',{'data-testid':'fake-record-done',onClick:onRecorded},'Recorded'),
  h('button',{'data-testid':'fake-record-close',onClick:onClose},'Cancel'))
}));
jest.mock('@/lib/practice',()=>{
 const a=jest.requireActual('@/lib/practice');
 return {...a,practiceApi:{...a.practiceApi,week:jest.fn(),history:jest.fn()}};
});
const {practiceApi}=require('../src/lib/practice');
const PracticePage=require('../src/app/app/practice/page').default;
const dates=['2026-11-09','2026-11-10','2026-11-11','2026-11-12',
 '2026-11-13','2026-11-14','2026-11-15'];
const activity=(id='t1')=>({id,title:'Fictional matching cards',
 slots:[{date:'2026-11-11',status:'PLANNED'}],service:'speech'});
const child=(id='child-a')=>({id,name:'Fictional Alex',
 activities:[activity(id+'-activity')]});
const week=(more={})=>({
 today:'2026-11-11',week:{start:'2026-11-09',days:dates},
 gates:{practiceDemo:true},children:[child()],...more
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(PracticePage));});
const out=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();practiceApi.week.mockReset();practiceApi.history.mockReset();
 practiceApi.week.mockResolvedValue(week());
 practiceApi.history.mockResolvedValue({items:[]});
 session={activeContext:{type:'center',centerId:'center-a'},
 permissions:['family.practice.read']};
 onError=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted guardian synthetic practice keeps progress and releases separate',()=>{
 it('fetches exact center week and shows explicit non-clinical sample warning',async()=>{
  await mount();
  expect(practiceApi.week).toHaveBeenCalledWith('center-a',undefined);
  expect(get('practice-page')).toBeTruthy();
  expect(get('practice-child-name').props.children).toBe('For Fictional Alex');
  expect(get('practice-sample-banner')).toBeTruthy();
  expect(out()).toContain('never counted as therapy progress');
 });
 it('separates the exact current day from other weekly fictional slots',async()=>{
  await mount();
  expect(get('practice-today')).toBeTruthy();
  expect(get('practice-activity-child-a-activity')).toBeTruthy();
  await click('practice-view-week');
  expect(get('practice-week')).toBeTruthy();
  expect(get('practice-week-nav')).toBeTruthy();
  expect(get('practice-week-next').props.disabled).toBe(true);
 });
 it('pages previous week using UTC dates with no locale rollover',async()=>{
  await mount();await click('practice-view-week');
  await click('practice-week-prev');
  expect(practiceApi.week).toHaveBeenLastCalledWith('center-a','2026-11-02');
 });
 it('switches connected family child without reading unrelated center data',async()=>{
  practiceApi.week.mockResolvedValue(week({children:[child(),child('child-b')]}));
  await mount();
  expect(get('practice-children')).toBeTruthy();
  await click('practice-child-child-b');
  expect(get('fake-requests-child-b')).toBeTruthy();
  expect(get('practice-child-child-b').props['aria-pressed']).toBe(true);
  expect(practiceApi.week).toHaveBeenCalledTimes(1);
 });
 it('refuses any recording when synthetic practice gate is off',async()=>{
  practiceApi.week.mockResolvedValue(week({gates:{practiceDemo:false}}));
  await mount();
  expect(get('fake-record-child-a-activity').props.disabled).toBe(true);
  expect(out()).toContain('Recording answers is switched off');
  expect(find('fake-record-dialog')).toHaveLength(0);
 });
 it('opens the real route-level record flow only for an eligible synthetic slot',async()=>{
  await mount();await click('fake-record-child-a-activity');
  expect(get('fake-record-dialog')).toBeTruthy();
  expect(out()).toContain('child-a');
  await click('fake-record-close');
  expect(find('fake-record-dialog')).toHaveLength(0);
 });
 it('uses the exact child-scoped history endpoint and preserves family sample choice',async()=>{
  practiceApi.history.mockResolvedValue({items:[{
   id:'feedback-a',activity:'Fictional matching cards',practiceDate:'2026-11-10',
   recordedAt:'2026-11-10T09:00:00Z',choice:'NEEDED_HELP',
   seenByCareTeam:true
  }]});
  await mount();await click('practice-view-history');
  expect(practiceApi.history).toHaveBeenCalledWith('center-a','child-a');
  expect(get('history-item-feedback-a')).toBeTruthy();
  expect(get('history-seen-feedback-a')).toBeTruthy();
  expect(find('practice-today')).toHaveLength(0);
 });
 it('shows no-linked-child and empty-sample cases without inventing clinical tasks',async()=>{
  practiceApi.week.mockResolvedValue(week({children:[]}));
  await mount();
  expect(get('practice-empty')).toBeTruthy();
  expect(find('practice-activity-child-a-activity')).toHaveLength(0);
 });
 it('preserves source-validated history empty and retry states',async()=>{
  await mount();await click('practice-view-history');
  expect(get('history-empty')).toBeTruthy();
 });
 it('shows a denial and retries exact current center',async()=>{
  practiceApi.week.mockRejectedValueOnce(new Error('Synthetic permission denied'))
   .mockResolvedValueOnce(week());
  await mount();
  expect(get('practice-error')).toBeTruthy();
  expect(find('practice-child-name')).toHaveLength(0);
  const button=get('practice-error').findAllByType('button')[0];
  await act(async()=>{button.props.onClick();await Promise.resolve();});
  expect(get('practice-page')).toBeTruthy();
  expect(practiceApi.week).toHaveBeenCalledTimes(2);
 });
});
