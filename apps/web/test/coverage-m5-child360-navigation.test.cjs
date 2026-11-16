const React=require('react');
const {act,create}=require('react-test-renderer');
const h=React.createElement;
const {Child360Navigation,primaryChildSection,defaultChildSection} = require('../src/components/clinical/Child360Navigation');
let tree;
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async(selected,onSelect=jest.fn())=>act(async()=>{tree=create(h(Child360Navigation,{selected,onSelect},h('p',null,'Authorized synthetic panel')));});
const tabs=()=>tree.root.findAllByProps({role:'tab'});
const serialized=()=>JSON.stringify(tree.toJSON());

describe('M5-05 staged Child 360 IA',()=>{
 it('maps all six legacy destinations to exactly five primary sections without hiding assessments',()=>{
   expect(['overview','plan','assessments','sessions','progress','reports'].map(primaryChildSection))
     .toEqual(['overview','care','care','sessions','progress','documents']);
   expect(['overview','care','sessions','progress','documents'].map(defaultChildSection))
     .toEqual(['overview','plan','sessions','progress','reports']);
 });
 it('renders only the authorized active panel under five top tabs',async()=>{
   await mount('overview');
   expect(tabs()).toHaveLength(5);
   expect(tabs().map(x=>x.props['data-testid'])).toEqual(['clinical-tab-overview','clinical-tab-care','clinical-tab-sessions','clinical-tab-progress','clinical-tab-documents']);
   expect(tabs().map(x=>x.props.children)).toEqual(['Overview','Care','Sessions','Progress','Documents']);
   expect(tree.root.findAllByProps({role:'tabpanel'})).toHaveLength(1);
   expect(serialized()).toContain('Authorized synthetic panel');
   expect(serialized()).not.toContain('Therapy plans');
 });
 it('preserves assessment access as a clearly labelled secondary Care decision',async()=>{
   const onSelect=jest.fn();
   await mount('assessments',onSelect);
   expect(tabs().find(x=>x.props['aria-selected']).props.children).toBe('Care');
   expect(serialized()).toContain('Therapy plans');
   expect(serialized()).toContain('Assessments');
   await act(async()=>tree.root.findByProps({'data-testid':'clinical-secondary-plan'}).props.onClick());
   expect(onSelect).toHaveBeenCalledWith('plan');
   onSelect.mockClear();
   await act(async()=>tabs().find(x=>x.props.children==='Care').props.onClick());
   expect(onSelect).not.toHaveBeenCalled();
 });
 it('primary Documents and Care tabs map back to existing permission-checked panels',async()=>{
   const onSelect=jest.fn();
   await mount('reports',onSelect);
   expect(tabs().find(x=>x.props['aria-selected']).props.children).toBe('Documents');
   await act(async()=>tabs().find(x=>x.props.children==='Care').props.onClick());
   expect(onSelect).toHaveBeenCalledWith('plan');
 });
});
