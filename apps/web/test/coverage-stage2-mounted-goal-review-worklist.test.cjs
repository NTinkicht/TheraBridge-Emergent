// Stage 2: real source-driven clinician goal review list in center-local time.
// Dates are reminders, never achievement, clinical approval or family release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const {GoalReviewWorklist}=require('../src/components/clinical/GoalReviewWorklist');
const {centerLocalDay}=require('../src/lib/goal-review');
const today=centerLocalDay('Asia/Dubai',new Date());
const dateAfter=n=>{
 const start=Date.parse(today+'T00:00:00Z');
 return new Date(start+n*86400000).toISOString().slice(0,10);
};
const goal=(n,more={})=>({key:'g'+n,title:'Fictional goal '+n,
 measure:'count',baseline:1,target:5,horizon:'SHORT_TERM',
 reviewOn:dateAfter(n),targetOn:dateAfter(25),...more});
const version=(goals)=>({id:'version-current',number:3,status:'DRAFT',
 goals,homeActivities:[{templateId:'template-a',goalKey:'g1',frequency:'weekly'}]});
const workspace=(goals=[],more={})=>({
 timezone:'Asia/Dubai',
 plans:[{id:'plan-a',title:'Synthetic plan',service:'speech',versions:[version(goals)]}],
 observations:[{id:'obs-a',planVersionId:'version-current',goalKey:'g1'}],...more
});
let tree,previousWindow,previousDocument;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const render=async(ws)=>act(async()=>{tree=create(h(GoalReviewWorklist,{ws}));});
beforeAll(()=>{
 previousWindow=global.window;previousDocument=global.document;
 global.window={addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.document={visibilityState:'visible',addEventListener:jest.fn(),
 removeEventListener:jest.fn(),getElementById:jest.fn(()=>null)};
});
afterAll(()=>{global.window=previousWindow;global.document=previousDocument;});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.clearAllMocks();});
describe('mounted center-local clinician review reminders',()=>{
 it('shows empty state for plans with no saved goals',async()=>{
  await render(workspace());
  expect(get('goal-review-empty')).toBeTruthy();
  expect(find('goal-review-row-g1')).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain('not trigger notifications');
 });
 it('distinguishes overdue, today, upcoming and undated current goals',async()=>{
  await render(workspace([
   goal(1,{reviewOn:dateAfter(-2)}),
   goal(2,{reviewOn:today}),
   goal(3),
   goal(4,{reviewOn:undefined})
  ]));
  expect(get('goal-review-row-g1')).toBeTruthy();
  const output=JSON.stringify(tree.toJSON());
  expect(output).toContain('Review date passed');
  expect(output).toContain('Review scheduled today');
  expect(output).toContain('Review within 14 days');
  expect(output).toContain('No review date set');
  expect(get('goal-review-row-g1').findAllByType('p').some(p=>Array.isArray(p.props.children)&&p.props.children.includes(1))).toBe(true);
  expect(output).toContain('1 linked home activity(ies)');
  expect(output).toContain('does not mean a goal was achieved');
 });
 it('does not interpret historical version measurements as current goals',async()=>{
  const ws=workspace([goal(1)]);
  ws.plans[0].versions.push({id:'version-old',number:2,goals:[
   goal(99,{title:'Historical goal should remain absent'})
  ],homeActivities:[]});
  ws.observations.push({id:'historical-observation',planVersionId:'version-old',goalKey:'g1'});
  await render(ws);
  expect(find('goal-review-row-g99')).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).not.toContain('Historical goal should remain absent');
  expect(get('goal-review-row-g1').findAllByType('p').some(p=>Array.isArray(p.props.children)&&p.props.children.includes(1))).toBe(true);
 });
 it('expands beyond 12 rows and contracts without changing review status',async()=>{
  const goals=Array.from({length:14},(_,i)=>goal(i+1));
  await render(workspace(goals));
  expect(find('goal-review-row-g14')).toHaveLength(0);
  await click('goal-review-show-all');
  expect(get('goal-review-row-g14')).toBeTruthy();
  await click('goal-review-show-all');
  expect(find('goal-review-row-g14')).toHaveLength(0);
  expect(get('goal-review-row-g1')).toBeTruthy();
 });
 it('fails closed on an invalid timezone while retaining goal inspection',async()=>{
  await render(workspace([goal(1)],{timezone:'Invalid/Clinical_Zone'}));
  expect(get('goal-review-timezone-invalid')).toBeTruthy();
  expect(get('goal-review-row-g1')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Review timing unavailable');
 });
 it('jumps only to an existing exact goal anchor and makes it keyboard focusable',async()=>{
  const focus=jest.fn(),scrollIntoView=jest.fn();
  global.document.getElementById.mockReturnValue({focus,scrollIntoView});
  await render(workspace([goal(1)]));
  await click('goal-review-open-g1');
  expect(global.document.getElementById).toHaveBeenCalledWith('goal-review-plan-a-g1');
  expect(scrollIntoView).toHaveBeenCalledWith({behavior:'smooth',block:'center'});
  expect(focus).toHaveBeenCalledWith({preventScroll:true});
 });
});
