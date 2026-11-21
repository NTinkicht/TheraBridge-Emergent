// M4-08: real goal-version evidence mapping and mounted read-only renderer.
// Synthetic plan versions ensure repeated goal keys cannot mix historical
// observations or imply clinical progress. No approval/signing paths.
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/design/ui',()=>({Card:({children,testId})=>h('section',{'data-testid':testId},children)}));
jest.mock('@/components/operations/BookDialog',()=>({serviceLabel:s=>'Synthetic '+s}));
const {GoalVersionContext}=require('../src/components/clinical/GoalVersionContext');
const {goalVersionContext}=require('../src/lib/goal-version-context');
const goal=(extra={})=>({
 key:'reused-key',title:'Synthetic speech goal',measure:'count',baseline:1,target:5,
 horizon:null,targetOn:null,reviewOn:null,...extra
});
const checkpoint=(extra={})=>({
 kind:'GOAL_CHECKPOINT',goalKey:'reused-key',
 at:'2026-11-10T10:00:00.000Z',reviewedOn:'2026-11-10',
 summary:'Fictional clinician note',observationIds:['obs-v2'],...extra
});
const version=(id,number,status,goals=[goal()],checkpoints=[])=>({
 id,number,status,goals,goalCheckpoints:checkpoints
});
const plan=(id,service,versions)=>({id,title:'Synthetic '+id,service,versions});
const observation=(id,planVersionId,goalKey,value)=>({
 id,planVersionId,goalKey,observedOn:'2026-11-09',value,note:'Synthetic observation'
});
const fixture=()=>({
 child:{id:'child-1'},
 plans:[
  plan('speech-plan','speech',[
   version('v1',1,'SUPERSEDED',[goal({target:4})]),
   version('v2',2,'DRAFT',[goal({target:8})],[checkpoint()])
  ]),
  plan('ot-plan','occupational',[version('ot-v1',1,'DRAFT',[goal({key:'ot-goal',title:'OT synthetic',horizon:'SHORT_TERM'})])])
 ],
 observations:[
  observation('obs-v1','v1','reused-key',2),
  observation('obs-v2','v2','reused-key',3),
  observation('wrong-key','v2','unrelated-key',999),
 ]
});
let tree, navigate, previousWindow, pushed;
const mount=async(ws=fixture())=>act(async()=>{
 navigate=jest.fn();
 tree=create(h(GoalVersionContext,{ws,onNavigate:navigate}));
});
const get=id=>tree.root.findByProps({'data-testid':id});
const all=id=>tree.root.findAllByProps({'data-testid':id});
const html=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{
 previousWindow=global.window;
 pushed=jest.fn();
 global.window={history:{pushState:pushed}};
});
afterAll(()=>{global.window=previousWindow;});
beforeEach(()=>pushed.mockClear());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real goal-version mapper preserves evidence provenance',()=>{
 it('does not mix identical goal keys from two versions',()=>{
  const mapped=goalVersionContext(fixture());
  const rows=mapped[0].rows;
  const current=rows.find(x=>x.versionId==='v2');
  const historical=rows.find(x=>x.versionId==='v1');
  expect(current.observations.map(x=>x.id)).toEqual(['obs-v2']);
  expect(historical.observations.map(x=>x.id)).toEqual(['obs-v1']);
  expect(current.currentVersion).toBe(true);
  expect(historical.currentVersion).toBe(false);
  expect(current.sameKeyOlderVersion).toBe(1);
  expect(current.definitionDifferences).toContain('target');
  expect(historical.sameKeyOlderVersion).toBeNull();
 });
 it('filters unrelated goal keys even in an otherwise valid version',()=>{
  const rows=goalVersionContext(fixture())[0].rows;
  expect(rows.flatMap(x=>x.observations.map(y=>y.id))).not.toContain('wrong-key');
 });
 it('does not treat unrelated checkpoints or non-goal entries as evidence',()=>{
  const ws=fixture();
  ws.plans[0].versions[1].goalCheckpoints.push(
   checkpoint({kind:'OTHER',summary:'Not goal review'}),
   checkpoint({goalKey:'another-goal',summary:'Different goal'})
  );
  expect(goalVersionContext(ws)[0].rows.find(x=>x.versionId==='v2').checkpoints)
    .toHaveLength(1);
 });
 it('handles empty plans and filters empty versions without inventing goals',()=>{
  expect(goalVersionContext({plans:[],observations:[]})).toEqual([]);
  expect(goalVersionContext({plans:[plan('empty','speech',[version('v',1,'DRAFT',[])])],observations:[]}))
    .toEqual([]);
 });
 it('returns a current version only when an eligible non-withdrawn version exists',()=>{
  const ws=fixture();
  ws.plans[0].versions[1].status='WITHDRAWN';
  const rows=goalVersionContext(ws)[0].rows;
  expect(rows.find(x=>x.versionId==='v2').currentVersion).toBe(false);
  expect(rows.find(x=>x.versionId==='v1').currentVersion).toBe(false);
 });
});
describe('M4-08 mounted read-only evidence context does not claim cross-version continuity',()=>{
 it('renders exact version and independent observation/checkpoint counts',async()=>{
  await mount();
  expect(all('progress-context-plan')).toHaveLength(2);
  expect(all('progress-context-goal')).toHaveLength(3);
  expect(html()).toContain('Same identifier appeared in an older plan version');
  expect(html()).toContain('target');
  expect(html()).toContain('No observation or clinician checkpoint is automatically transferred');
  expect(all('progress-context-version-boundary')).toHaveLength(1);
 });
 it('displays no observations and no checkpoints when a goal lacks both',async()=>{
  const ws=fixture();ws.observations=[];
  await mount(ws);
  expect(html()).toContain('No observations recorded for this exact goal version');
  expect(html()).toContain('No clinician review checkpoints saved for this exact goal version');
 });
 it('filters selected specialty and never leaks other specialty goal details',async()=>{
  await mount();
  await act(async()=>get('progress-context-service').props.onChange({target:{value:'occupational'}}));
  expect(all('progress-context-plan')).toHaveLength(1);
  expect(all('progress-context-goal')).toHaveLength(1);
  expect(html()).toContain('OT synthetic');
  expect(html()).not.toContain('Synthetic speech goal');
 });
 it('renders explicit empty message for a user selection with no matching specialty',async()=>{
  await mount();
  await act(async()=>get('progress-context-service').props.onChange({target:{value:'nonexistent'}}));
  expect(all('progress-context-plan')).toHaveLength(0);
  expect(get('progress-context-empty')).toBeTruthy();
 });
 it('navigates to the exact source version and goal key only on unmodified primary click',async()=>{
  await mount();
  const links=all('progress-context-open-goal');
  const target=links.find(x=>x.props.href.includes('version=v2'));
  const preventDefault=jest.fn();
  await act(async()=>target.props.onClick({
   button:0,preventDefault,
   currentTarget:{getAttribute:()=>target.props.href}
  }));
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(pushed).toHaveBeenCalledWith(null,'',expect.stringContaining('version=v2&goal=reused-key'));
  expect(navigate).toHaveBeenCalledTimes(1);
 });
 it.each([{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}])(
  'preserves modified browser navigation for %j',async modifier=>{
   await mount();
   const target=all('progress-context-open-goal')[0],preventDefault=jest.fn();
   await act(async()=>target.props.onClick({button:0,...modifier,preventDefault,currentTarget:{getAttribute:()=>target.props.href}}));
   expect(preventDefault).not.toHaveBeenCalled();
   expect(pushed).not.toHaveBeenCalled();
   expect(navigate).not.toHaveBeenCalled();
  }
 );
 it('does not modify history when a current link is missing its href',async()=>{
  await mount();
  const target=all('progress-context-open-goal')[0],preventDefault=jest.fn();
  await act(async()=>target.props.onClick({button:0,preventDefault,currentTarget:{getAttribute:()=>null}}));
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(pushed).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
 });
});
