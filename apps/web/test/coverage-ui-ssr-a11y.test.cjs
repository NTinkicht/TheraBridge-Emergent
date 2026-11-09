// M4-08: execute real React presentation branches, with no browser, network or patient data.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {Button,LockedAction,Pill,SpecialtyTag,Card,CardHeader,Avatar,Meter,Metric,btn}=require('../src/components/design/ui');
const {navigateTabs}=require('../src/lib/a11y-tabs');
const h=React.createElement;
const render=(Component,props={},children)=>renderToStaticMarkup(children === undefined ? h(Component,props) : h(Component,props,children));
const Icon=()=>h('svg',{'aria-hidden':'true'},h('title',null,'Synthetic icon'));

describe('M4-08: render real UI surfaces with safety and accessibility semantics',()=>{
 it('uses accessible disabled reason for clinical and family locked actions',()=>{
  for(const tone of ['clinical','family']){
   const out=render(LockedAction,{id:'synthetic-locked',label:'Signing unavailable',
     reason:'Clinical authorization pending',tone,align:'end'});
   expect(out).toContain('disabled=""');
   expect(out).toContain('aria-describedby="synthetic-locked-reason"');
   expect(out).toContain('id="synthetic-locked-reason"');
   expect(out).toContain('Clinical authorization pending');
   expect(out).toContain('Signing unavailable');
   expect(out).not.toContain('onClick');
  }
 });
 it('renders buttons with correct semantic types, tones and sizes',()=>{
  const out=render(Button,{variant:'danger',tone:'family',size:'lg',type:'submit',
    className:'safe-test',children:'Cancel synthetic draft'});
  expect(out).toContain('type="submit"');
  expect(out).toContain('safe-test');
  expect(out).toContain('Cancel synthetic draft');
  expect(out).toContain('min-h-[52px]');
  expect(btn('ghost','clinical','sm')).toContain('min-h-[44px]');
 });
 it('preserves predictable labeled progressbar values and visual states',()=>{
  for(const state of ['ok','warn','limit','planned']){
   const out=render(Meter,{label:'Synthetic quota',value:3,max:4,state,hint:'Draft only'});
   expect(out).toContain('role="progressbar"');
   expect(out).toContain('aria-valuenow="3"');
   expect(out).toContain('aria-valuemax="4"');
   expect(out).toContain('width:75%');
   expect(out).toContain('Draft only');
  }
  expect(render(Meter,{label:'Capped',value:10,max:3})).toContain('width:100%');
 });
 it('shows metadata, optional actions and loading without fabricating a score',()=>{
  const normal=render(Metric,{label:'Synthetic sessions',value:7,sub:'Not outcomes',
    icon:Icon,accent:'caution',testId:'metric'});
  expect(normal).toContain('data-testid="metric-value"');
  expect(normal).toContain('Not outcomes');
  expect(normal).toContain('>7</p>');
  const loading=render(Metric,{label:'Synthetic sessions',value:7,sub:'Not outcomes',
    icon:Icon,loading:true,testId:'metric'});
  expect(loading).toContain('aria-busy="true"');
  expect(loading).toContain('data-testid="metric-loading"');
  expect(loading).not.toContain('data-testid="metric-value"');
 });
 it('renders family/clinical cards, pills, specialty labels and deterministic avatars',()=>{
  expect(render(Card,{tone:'family',testId:'panel',children:'Synthetic'}))
   .toContain('data-testid="panel"');
  expect(render(CardHeader,{title:'Synthetic heading',subtitle:'Fictional note',
   action:h('span',null,'Draft action'),tone:'family'})).toContain('Draft action');
  expect(render(Pill,{tone:'danger',icon:Icon,testId:'state',children:'Blocked'}))
   .toContain('Blocked');
  expect(render(SpecialtyTag,{s:'ot',long:true})).toContain('Occupational therapy');
  expect(render(SpecialtyTag,{s:'speech'})).toContain('Speech');
  expect(render(Avatar,{name:'Alex Morgan',size:40})).toContain('AM');
 });
});
describe('M4-08: WAI-ARIA keyboard tab navigation dispatches tab click guards',()=>{
 function fixture(currentIndex=1){
  const tabs=Array.from({length:3},(_,i)=>({focus:jest.fn(),click:jest.fn(),id:i}));
  const parent={querySelectorAll:jest.fn(()=>tabs)};
  const event=(key,target=tabs[currentIndex])=>({key,currentTarget:parent,target,
    preventDefault:jest.fn()});
  return {tabs,parent,event};
 }
 it('supports wraparound arrows, Home and End with focus and guarded click',()=>{
  const {tabs,event}=fixture(2);
  for(const [key,wanted] of [['ArrowRight',0],['ArrowLeft',1],['Home',0],['End',2]]){
   const e=event(key);navigateTabs(e);
   expect(e.preventDefault).toHaveBeenCalledTimes(1);
   expect(tabs[wanted].focus).toHaveBeenCalled();
   expect(tabs[wanted].click).toHaveBeenCalled();
  }
 });
 it('never steals unsupported keys or focus when event target is outside tablist',()=>{
  const {tabs,event}=fixture();
  const wrong=event('ArrowRight',{});navigateTabs(wrong);
  expect(wrong.preventDefault).not.toHaveBeenCalled();
  const unrelated=event('Enter');navigateTabs(unrelated);
  expect(unrelated.preventDefault).not.toHaveBeenCalled();
  expect(tabs.every(t=>t.click.mock.calls.length===0)).toBe(true);
 });
});
