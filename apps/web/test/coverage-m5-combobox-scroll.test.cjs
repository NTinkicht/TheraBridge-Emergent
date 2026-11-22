const {revealActiveSuggestion}=require('../src/lib/combobox-scroll');

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
