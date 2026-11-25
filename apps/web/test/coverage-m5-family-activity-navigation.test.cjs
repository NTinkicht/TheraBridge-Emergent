const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const {ActivityCard,SlotChip}=require('../src/components/practice/ActivityCard');
let tree;
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const a={id:'sample-a',title:'Fictional sorting',service:'speech',minutes:8,frequency:'Weekly',
 materials:['Cards'],steps:['Sort with supervision'],safety:['Adult nearby']};
const slot={date:'2026-11-23',recordable:true,status:'PLANNED'};
describe('M5 guardian feedback 28: accessible compact activity cards',()=>{
 it('uses rights-safe 4:3 placeholder and keeps instructions collapsed',async()=>{
  await act(async()=>{tree=create(React.createElement(ActivityCard,{a,slots:[slot],
   onRecord:()=>{},testId:'family-activity-a'}));});
  const media=tree.root.findByProps({'data-testid':'family-activity-a-illustration-placeholder'});
  expect(media.props.className).toContain('aspect-[4/3]');
  expect(JSON.stringify(tree.toJSON())).toContain('No approved image');
  expect(tree.root.findAllByProps({'data-testid':'family-activity-a-details'})).toHaveLength(0);
  const toggle=tree.root.findByProps({'data-testid':'family-activity-a-toggle'});
  expect(toggle.props['aria-expanded']).toBe(false);
  await act(async()=>toggle.props.onClick());
  expect(tree.root.findByProps({'data-testid':'family-activity-a-details'})).toBeTruthy();
 });
 it('places each date on the left and its record action at the right edge, including multiple days',async()=>{
  const record=jest.fn(),second={...slot,date:'2026-11-25'};
  await act(async()=>{tree=create(React.createElement(ActivityCard,{a,slots:[slot,second],onRecord:record,testId:'aligned'}));});
  const list=tree.root.findByProps({'aria-label':'Planned days'});
  expect(list.props.className).toContain('flex-col');
  const rows=list.findAllByType('li');expect(rows).toHaveLength(2);
  for(const row of rows){expect(row.props.className).toContain('w-full');expect(row.props.className).toContain('justify-between');expect(row.findByType('button').props.className).toContain('shrink-0');}
  await act(async()=>rows[1].findByType('button').props.onClick());expect(record).toHaveBeenCalledWith(second);
 });
 it('renders a keyboard-safe record button only when the slot and server-demo gate permit it',async()=>{
  const record=jest.fn();
  await act(async()=>{tree=create(React.createElement(SlotChip,{slot,onRecord:record,testId:'slot'}));});
  const button=tree.root.findByType('button');
  expect(button.props.type).toBe('button');
  expect(button.props['aria-label']).toContain('Record');
  expect(button.props.className).toContain('min-h-[44px]');
  await act(async()=>button.props.onClick());
  expect(record).toHaveBeenCalledTimes(1);
  await act(async()=>tree.update(React.createElement(SlotChip,{slot,onRecord:undefined,testId:'slot'})));
  expect(tree.root.findAllByType('button')).toHaveLength(0);
 });
});

const {guardianScopeKey}=require('../src/lib/guardian-scope');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

describe('M5 guardian #28–31: child and tenant state isolation',()=>{
 const identity=(user,center,role='GUARDIAN')=>({
  user:{id:user,email:'synthetic@example.test',displayName:'Synthetic'},
  activeContext:{type:'center',centerId:center,role},
 });
 it('changes the guardian view identity across users, centers and roles',()=>{
  const original=guardianScopeKey(identity('u1','centerA'));
  expect(guardianScopeKey(identity('u1','centerA'))).toBe(original);
  expect(guardianScopeKey(identity('u1','centerB'))).not.toBe(original);
  expect(guardianScopeKey(identity('u2','centerA'))).not.toBe(original);
  expect(guardianScopeKey(identity('u1','centerA','THERAPIST'))).not.toBe(original);
 });
 it('requires scoped remounts for practice, progress and released family documents',()=>{
  const src=relative=>readFileSync(resolve(__dirname,'../src/app/app',relative),'utf8');
  expect(src('practice/page.tsx')).toContain('<Practice key={guardianScopeKey(s)}');
  expect(src('family-progress/page.tsx')).toContain('<Demo key={guardianScopeKey(s)}');
  expect(src('family-documents/page.tsx')).toContain('<FamilyReleasedDocuments key={guardianScopeKey(session)}');
 });
 it('does not retain previous-child request/history views or a pending record dialog',()=>{
  const page=readFileSync(resolve(__dirname,'../src/app/app/practice/page.tsx'),'utf8');
  expect(page).toContain('<HistoryList key={child.id}');
  expect(page).toContain('<GuardianPlanRequestPanel key={child.id}');
  expect(page).toContain('setSelectedChildId(k.id); setRec(null);');
  expect(page).toContain('data.children.find(k => k.id === selectedChildId)');
 });
});
