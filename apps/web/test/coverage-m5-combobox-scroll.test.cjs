const {revealActiveSuggestion,effectiveSuggestionIndex}=require('../src/lib/combobox-scroll');

const list = (scrollTop, rowTop, rowHeight=44, clientHeight=224) => ({
 scrollTop, offsetTop:10, clientHeight,
 children:{item:(index)=>index===7?{offsetTop:rowTop,offsetHeight:rowHeight}:null}
});
describe('M5 Codex P2: active combobox option stays visible within overflowing listbox',()=>{
 it('scrolls down to the eighth keyboard option without moving the page',()=>{
  const l=list(0,7*44);
  revealActiveSuggestion(l,7);
  expect(l.scrollTop).toBe(7*44+44-224);
 });
 it('scrolls back up for reverse keyboard selection',()=>{
  const l=list(240,40);
  revealActiveSuggestion(l,7);
  expect(l.scrollTop).toBe(40);
 });
 it('does not scroll if selected option is already visible',()=>{
  const l=list(180,210);
  revealActiveSuggestion(l,7);
  expect(l.scrollTop).toBe(180);
 });
 it('clamps negative offsets instead of setting invalid scroll positions',()=>{
  const l=list(120,-50);
  revealActiveSuggestion(l,7);
  expect(l.scrollTop).toBe(0);
 });
 it('does nothing when the list is hidden, index malformed, or item missing',()=>{
  expect(()=>revealActiveSuggestion(null,7)).not.toThrow();
  const l=list(200,240);
  revealActiveSuggestion(l,NaN);
  revealActiveSuggestion(l,-1);
  revealActiveSuggestion(l,6);
  expect(l.scrollTop).toBe(200);
 });
});

describe('M5 Codex P2: active selection never disagrees with ARIA after result scope shrinks',()=>{
 it('clamps an old eighth option to the second new result consistently',()=>{
  const selected=effectiveSuggestionIndex(7,2);
  expect(selected).toBe(1);
  const options=[{id:'synthetic-a'},{id:'synthetic-b'}];
  expect(options.map((_,i)=>i===selected)).toEqual([false,true]);
  expect(options[selected].id).toBe('synthetic-b');
 });
 it('starts with the first result when its old index is invalid',()=>{
  expect(effectiveSuggestionIndex(-1,3)).toBe(0);
  expect(effectiveSuggestionIndex(Number.NaN,3)).toBe(0);
  expect(effectiveSuggestionIndex(8,1)).toBe(0);
 });
 it('never exposes a stale target when no authorized results remain',()=>{
  expect(effectiveSuggestionIndex(7,0)).toBe(-1);
  expect(effectiveSuggestionIndex(7,-1)).toBe(-1);
  expect(effectiveSuggestionIndex(7,Number.NaN)).toBe(-1);
 });
 it('binds both screen pickers to the same effective index for highlight and keyboard selection',()=>{
  const fs=require('fs'),path=require('path');
  for(const route of ['app/children/page.tsx','app/schedule/page.tsx']){
   const src=fs.readFileSync(path.join(__dirname,'../src/app',route),'utf8');
   expect(src).toContain('effectiveSuggestionIndex(activeSuggestion,');
   expect(src).toContain('aria-selected={index === selectedSuggestionIndex}');
   expect(src).toContain('revealActiveSuggestion(suggestionListRef.current, selectedSuggestionIndex)');
  }
 });
});
