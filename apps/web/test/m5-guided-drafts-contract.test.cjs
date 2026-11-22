const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const {DraftSetupSteps}=require('../src/components/clinical/DraftSetupSteps');
let tree;
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M5 observation 23: draft-only authoring setup guides',()=>{
 it.each([
  ['report','report-draft-identity','report-draft-period'],
  ['plan','plan-draft-identity','plan-draft-action'],
 ])('provides two scoped, accessible %s setup anchors without write side effects',async(kind,first,second)=>{
  await act(async()=>{tree=create(React.createElement(DraftSetupSteps,{kind,titleId:first,detailId:second}));});
  const nav=tree.root.findByProps({'data-testid':kind+'-draft-setup-steps'});
  expect(nav.type).toBe('nav');
  expect(nav.props['aria-label']).toBe(kind+' draft creation steps');
  expect(nav.findAllByType('a').map(x=>x.props.href)).toEqual(['#'+first,'#'+second]);
  expect(JSON.stringify(tree.toJSON())).toContain('No signing, approval or family release');
 });
});
