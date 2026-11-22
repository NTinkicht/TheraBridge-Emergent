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
