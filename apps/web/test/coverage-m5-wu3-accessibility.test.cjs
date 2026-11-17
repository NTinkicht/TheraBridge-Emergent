// M5-10: source-executing keyboard RTL and exact-version performance regressions.
const fs=require('node:fs');
const path=require('node:path');
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const h=React.createElement;
const {WorkspaceTabs}=require('../src/components/design/workspace-patterns');
const {summarizeObservations}=require('../src/lib/progress-analysis');
const read=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const tabs=[
 {id:'first',label:'First',content:'Private one'},
 {id:'second',label:'Second',content:'Private two'},
 {id:'blocked',label:'Blocked',disabled:true,content:'Not authorized'},
];
describe('M5-10 keyboard, RTL, focus landmarks and responsive contracts',()=>{
 it('RTL arrow navigation reverses movement but Home/End skip disabled tabs',async()=>{
  const before=global.document;
  const focused=jest.fn();const select=jest.fn();
  global.document={documentElement:{dir:'rtl'},getElementById:()=>({focus:focused})};
  let tree;
  try {
   await act(async()=>{tree=create(h(WorkspaceTabs,{tabs,selected:'first',onSelect:select,label:'Authorized tabs'}));});
   const items=tree.root.findAllByProps({role:'tab'});
   expect(tree.root.findByProps({role:'tablist'}).props['aria-orientation']).toBe('horizontal');
   await act(async()=>items[0].props.onKeyDown({key:'ArrowLeft',preventDefault:jest.fn()}));
   expect(select).toHaveBeenLastCalledWith('second');
   await act(async()=>items[0].props.onKeyDown({key:'ArrowRight',preventDefault:jest.fn()}));
   expect(select).toHaveBeenLastCalledWith('second');
   await act(async()=>items[1].props.onKeyDown({key:'Home',preventDefault:jest.fn()}));
   expect(select).toHaveBeenLastCalledWith('first');
   await act(async()=>items[0].props.onKeyDown({key:'End',preventDefault:jest.fn()}));
   expect(select).toHaveBeenLastCalledWith('second');
   expect(focused).toHaveBeenCalledTimes(4);
   expect(JSON.stringify(tree.toJSON())).not.toContain('Not authorized');
  } finally {if(tree)await act(async()=>tree.unmount());global.document=before;}
 });
 it('shell exposes an actual skip link to a focusable landmark and mobile-safe layout',()=>{
  const shell=read('components/auth/ProductShell.tsx');
  expect(shell).toContain('href="#main"');
  expect(shell).toContain('data-testid="skip-to-main"');
  expect(shell).toContain('<main id="main" tabIndex={-1}');
  expect(shell).toContain('data-testid="mobile-more-sheet"');
  expect(shell).toContain('aria-modal="true"');
 });
 it('reduced motion and family focus contracts remain explicit',()=>{
  const css=read('app/globals.css');
  expect(css).toContain('prefers-reduced-motion: reduce');
  expect(css).toContain('scroll-padding-block-start');
  expect(css).toContain('var(--focus-ring');
  expect(css).toContain('[dir="rtl"]');
 });
 it('dense observations remain sorted, scoped to exact plan version and numerically identical',()=>{
  const observations=Array.from({length:1500},(_,i)=>({
   id:'obs-'+String(i).padStart(4,'0'),
   planVersionId:i%7===0?'historical':'v-current',goalKey:'g1',
   observedOn:'2026-11-09',value:i%5
  }));
  const result=summarizeObservations(observations,'v-current','g1','week');
  const eligible=observations.filter(x=>x.planVersionId==='v-current');
  expect(result).toHaveLength(1);
  expect(result[0].count).toBe(eligible.length);
  expect(result[0].sourceIds).toEqual(eligible.map(x=>x.id));
  expect(result[0].average).toBe(Number((eligible.reduce((sum,x)=>sum+x.value,0)/eligible.length).toFixed(2)));
  expect(result[0].latestOn).toBe('2026-11-09');
  expect(result[0].sourceIds).not.toContain('obs-0000');
 });
});
