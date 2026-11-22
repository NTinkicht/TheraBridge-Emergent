// Gemini follow-up: two independently mounted consumers must never disagree
// about the shared UI-only app theme (also across browser storage events).
const React = require('react');
const Renderer = require('react-test-renderer');
const { act, create } = Renderer;
const h = React.createElement;
const { useAppTheme, applyAppTheme, currentAppTheme } =
  require('../src/components/theme/useAppTheme');

let tree, oldWindow, oldDocument, oldStorage, windowListeners, saved, log;
const get = id => tree.root.findByProps({'data-testid': id});
function Consumer({id}) {
  const {theme, toggleTheme} = useAppTheme();
  return h('button', {'data-testid':id, 'data-theme':theme, onClick:toggleTheme}, theme);
}
async function mount() {
  await act(async()=>{tree=create(h(React.Fragment, null,
    h(Consumer,{id:'theme-reader-a'}),h(Consumer,{id:'theme-reader-b'})));});
}
beforeEach(()=>{
  oldWindow=global.window;oldDocument=global.document;oldStorage=global.localStorage;
  tree=null; windowListeners=new Map();saved=new Map();log=[];
  global.document={documentElement:{dataset:{appTheme:'light',familyTheme:'light'}}};
  global.window={
    addEventListener:(type,listener)=>{
      if(!windowListeners.has(type))windowListeners.set(type,new Set());
      windowListeners.get(type).add(listener);
    },
    removeEventListener:(type,listener)=>windowListeners.get(type)?.delete(listener)
  };
  global.localStorage={
    setItem:(k,v)=>{saved.set(k,v);log.push([k,v]);},
    getItem:k=>saved.get(k)??null,
  };
});
afterEach(async()=>{
  if(tree){await act(async()=>tree.unmount());tree=null;}
  global.window=oldWindow;global.document=oldDocument;global.localStorage=oldStorage;
});
describe('M5 shared theme store, no cross-screen stale state',()=>{
  it('immediately updates both mounted consumers after either toggle',async()=>{
    await mount();
    expect(get('theme-reader-a').props['data-theme']).toBe('light');
    expect(get('theme-reader-b').props['data-theme']).toBe('light');
    await act(async()=>get('theme-reader-a').props.onClick());
    expect(get('theme-reader-a').props['data-theme']).toBe('dark');
    expect(get('theme-reader-b').props['data-theme']).toBe('dark');
    expect(currentAppTheme()).toBe('dark');
    expect(saved.get('tb-app-theme')).toBe('dark');
    expect(saved.get('tb-family-theme')).toBe('dark');
    await act(async()=>get('theme-reader-b').props.onClick());
    expect(get('theme-reader-a').props['data-theme']).toBe('light');
    expect(get('theme-reader-b').props['data-theme']).toBe('light');
    expect(global.document.documentElement.dataset.appTheme).toBe('light');
  });
  it('reconciles a remote tab preference for both subscribers',async()=>{
    await mount();
    saved.set('tb-app-theme','dark');
    await act(async()=>{for(const fn of windowListeners.get('storage'))
      fn({key:'tb-app-theme',newValue:'dark'});});
    expect(get('theme-reader-a').props['data-theme']).toBe('dark');
    expect(get('theme-reader-b').props['data-theme']).toBe('dark');
    expect(global.document.documentElement.dataset.familyTheme).toBe('dark');
    saved.set('tb-app-theme','light');
    await act(async()=>{for(const fn of windowListeners.get('storage'))
      fn({key:'tb-app-theme',newValue:'light'});});
    expect(get('theme-reader-a').props['data-theme']).toBe('light');
    expect(get('theme-reader-b').props['data-theme']).toBe('light');
  });
  it('ignores untrusted storage keys and cannot grant any permission',async()=>{
    await mount();
    await act(async()=>{for(const fn of windowListeners.get('storage'))
      fn({key:'session-permissions',newValue:'admin'});});
    expect(get('theme-reader-a').props['data-theme']).toBe('light');
    expect(currentAppTheme()).toBe('light');
    expect(saved.has('session-permissions')).toBe(false);
  });
  it('works when localStorage is disabled, and cleans up subscriptions',async()=>{
    await mount();
    global.localStorage.setItem=()=>{throw new Error('storage disabled');};
    await act(async()=>applyAppTheme('dark'));
    expect(get('theme-reader-a').props['data-theme']).toBe('dark');
    expect(get('theme-reader-b').props['data-theme']).toBe('dark');
    expect(log).toEqual([]);
    await act(async()=>tree.unmount());tree=null;
    expect(windowListeners.get('storage').size).toBe(0);
  });
});
