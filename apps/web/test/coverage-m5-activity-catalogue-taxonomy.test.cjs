// Real ActivityCard render branches for optional clinician-authored taxonomy.
// Empty taxonomy is meaningful and must never be fabricated in family views.
const React=require('react');
const {act,create}=require('react-test-renderer');
const h=React.createElement;
const {ActivityCard}=require('../src/components/clinical/ActivityCard');
const base={id:'fictional-a',title:'Synthetic choice cards',service:'speech',
 ageBand:'3-6 years',minutes:8,library:'center',
 materials:['generic cards'],steps:['Choose a card','Wait'],safety:['Supervise']};
let tree;
const render=(t,opts={})=>act(()=>{tree=create(h(ActivityCard,{t:{...base,...t},...opts}));});
const output=()=>JSON.stringify(tree.toJSON());
afterEach(()=>{if(tree){act(()=>tree.unmount());tree=null;}});
describe('M5-12 actual activity card taxonomy choices',()=>{
 it('shows category, skill and equipment together with accessible specialty text',()=>{
  render({category:'Communication',skill:'Choice making',equipment:['cards','mat']},{visual:true,compact:true});
  expect(output()).toContain('Category: Communication');
  expect(output()).toContain('Skill: Choice making');
  expect(output()).toContain('Equipment:');
  expect(output()).toContain('cards, mat');
  expect(output()).toContain('No approved illustration available');
  expect(tree.root.findAllByType('details')).toHaveLength(1);
 });
 it('handles category-only and skill-only without spurious separators',()=>{
  render({category:'Motor',skill:null,equipment:[]});
  expect(output()).toContain('Category: Motor');
  expect(output()).not.toContain('Skill:');
  act(()=>tree.unmount());tree=null;
  render({category:null,skill:'Matching',equipment:[]});
  expect(output()).toContain('Skill: Matching');
  expect(output()).not.toContain('Category:');
 });
 it('keeps legacy unspecified taxonomy absent and never invents equipment',()=>{
  render({category:null,skill:null,equipment:undefined,materials:[],steps:[]},{compact:true});
  expect(output()).not.toContain('Category:');
  expect(output()).not.toContain('Equipment:');
  expect(output()).not.toContain('Instructions (');
 });
 it('covers a family card with source-specific taxonomy but no private image',()=>{
  render({category:'Social',skill:'Turn taking',equipment:['toy'],library:'synthetic'},
    {tone:'family',visual:false});
  expect(output()).toContain('Category: Social');
  expect(output()).toContain('Skill: Turn taking');
  expect(output()).toContain('Equipment:');
  expect(output()).not.toContain('No approved illustration available');
  expect(tree.root.findAllByType('details')).toHaveLength(0);
 });
 it('handles multi-specialty and unknown specialty without licensing claims',()=>{
  render({services:['speech','occupational','behavioral'],category:'Shared',skill:'Cooperation'},
    {visual:true,layout:'list'});
  expect(output()).toContain('Category: Shared');
  expect(output()).toContain('Skill: Cooperation');
  expect(output()).toContain('No approved illustration available');
  act(()=>tree.unmount());tree=null;
  render({service:'other',services:['not-a-service'],equipment:['board']},{visual:true,layout:'grid'});
  expect(output()).toContain('Equipment:');
  expect(output()).toContain('No approved illustration available');
 });
});
