// Real source-executing synthetic-only dictation controls: simulated capture,
// multilingual fixture, user review and fail-closed clinical insertion.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,SelectField:({value,onChange,options,testId})=>
 h('select',{value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
 options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
const {Dictation}=require('../src/components/clinical/Dictation');
let tree,insert,pending,originalWindow;
const btn=label=>tree.root.findAllByType('button').find(b=>{
 const c=b.props.children;
 return typeof c==='string'&&c===label||Array.isArray(c)&&c.includes(label);
});
const click=async label=>act(async()=>{const b=btn(label);if(!b)throw Error('Missing button '+label);b.props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>tree.root.findByProps({'data-testid':id}).props.onChange({target:{value:v}}));
const get=id=>tree.root.findByProps({'data-testid':id});
const textInput=()=>tree.root.findAllByType('textarea').find(x=>x.props['aria-label']?.includes('transcript'));
const mount=async(disabled=false)=>act(async()=>{tree=create(h(Dictation,{
 disabled,onInsert:insert,onPending:pending
}));});
const flush=async()=>act(async()=>{jest.advanceTimersByTime(275);await Promise.resolve();});
beforeAll(()=>{originalWindow=global.window;global.window={confirm:jest.fn(()=>true)};});
afterAll(()=>{global.window=originalWindow;});
beforeEach(()=>{jest.useFakeTimers();insert=jest.fn(()=>({accepted:true}));pending=jest.fn();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.useRealTimers();});
describe('mounted fictional dictation never accesses microphone or persists without human review',()=>{
 it('starts with an idle capture and cannot insert a blank transcript',async()=>{
  await mount();
  expect(get('dictation-capture-state').props.children).toContain('idle');
  expect(btn('Insert reviewed text').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Real microphone and external processing disabled');
  expect(insert).not.toHaveBeenCalled();
 });
 it('simulates start, pause, resume, stop and reset without real microphone',async()=>{
  await mount();
  await click('Start simulated capture');
  expect(get('dictation-capture-state').props.children).toContain('simulating');
  expect(btn('Run synthetic transcription').props.disabled).toBe(true);
  await click('Pause simulated capture');
  expect(get('dictation-capture-state').props.children).toContain('paused');
  await click('Resume simulated capture');
  await click('Stop simulated capture');
  expect(get('dictation-capture-state').props.children).toContain('ready');
  await click('Discard simulated capture');
  expect(get('dictation-capture-state').props.children).toContain('idle');
  expect(insert).not.toHaveBeenCalled();
 });
 it('transcribes fictional language fixture and requires explicit insertion',async()=>{
  await mount();
  await change('dictation-language','fr');
  await click('Run synthetic transcription');await flush();
  expect(textInput().props.value).toContain('Exercice fictif');
  expect(insert).not.toHaveBeenCalled();
  await click('Insert reviewed text');
  expect(insert).toHaveBeenCalledWith(expect.stringContaining('Exercice fictif'));
  expect(textInput().props.value).toBe('');
 });
 it('retains editable text on rejected insertion with an explanatory message',async()=>{
  insert.mockReturnValue({accepted:false,message:'No active synthetic note'});
  await mount();
  await act(async()=>textInput().props.onChange({target:{value:'Reviewed fictional note'}}));
  await click('Insert reviewed text');
  expect(insert).toHaveBeenCalledWith('Reviewed fictional note');
  expect(textInput().props.value).toBe('Reviewed fictional note');
  expect(JSON.stringify(tree.toJSON())).toContain('No active synthetic note');
 });
 it('shows synthetic provider failures without inserting or losing typed notes',async()=>{
  await mount();
  await act(async()=>textInput().props.onChange({target:{value:'Unsaved local text'}}));
  await change('dictation-scenario','network');
  await click('Run synthetic transcription');await flush();
  expect(JSON.stringify(tree.toJSON())).toContain('Network failure (synthetic test)');
  expect(textInput().props.value).toBe('Unsaved local text');
  expect(insert).not.toHaveBeenCalled();
 });
 it('does not insert an empty provider result',async()=>{
  await mount();await change('dictation-scenario','empty');
  await click('Run synthetic transcription');await flush();
  expect(JSON.stringify(tree.toJSON())).toContain('No transcript returned');
  expect(btn('Insert reviewed text').props.disabled).toBe(true);
 });
 it('retains transcript on disabled clinical editor and blocks insertion',async()=>{
  await mount();
  await act(async()=>textInput().props.onChange({target:{value:'Local unsaved evidence'}}));
  await act(async()=>tree.update(h(Dictation,{disabled:true,onInsert:insert,onPending:pending})));
  expect(textInput().props.readOnly).toBe(true);
  expect(btn('Insert reviewed text').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Retained uninserted transcript');
  expect(insert).not.toHaveBeenCalled();
 });
 it('respects confirmation before clearing valuable local text',async()=>{
  await mount();
  await act(async()=>textInput().props.onChange({target:{value:'Local transcript'}}));
  global.window.confirm.mockReturnValueOnce(false);
  await click('Discard transcript');
  expect(textInput().props.value).toBe('Local transcript');
  await click('Discard transcript');
  expect(textInput().props.value).toBe('');
 });
});
