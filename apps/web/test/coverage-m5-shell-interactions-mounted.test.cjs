// M5 role-scoped navigation: real mounted shell interactions, fictional identities only.
const React=require('react'), Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const router={replace:jest.fn(),push:jest.fn()};
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/brand/BrandMark',()=>({BrandMark:()=>h('span',null,'Brand')}));
jest.mock('@/components/brand/SignatureBand',()=>({SignatureBand:()=>h('span',null,'Signature')}));
jest.mock('@/components/design/ui',()=>({Avatar:({name})=>h('span',null,name)}));
const {ProductShell}=require('../src/components/auth/ProductShell');
const {Baby}=require('lucide-react');
const center={type:'center',role:'THERAPIST',membershipId:'membership-1',centerId:'synthetic-center',centerName:'Imaginary Clinic'};
const guardian={...center,role:'GUARDIAN'};
const s=(overrides={})=>({
  csrfToken:'',user:{id:'actor-1',email:'actor@example.invalid',displayName:'Fictional Clinician'},
  contexts:[center],activeContext:center,
  permissions:['center.children.read','center.schedule.read','center.activities.read','center.clinical.read'],
  ...overrides
});
let tree,oldDocument,oldWindow,oldStorage,media,focusLog,panelFocusables;
const get=id=>tree.root.findByProps({'data-testid':id});
const all=id=>tree.root.findAllByProps({'data-testid':id});
const mount=async(session=s(),active='children',planned=[])=>act(async()=>{tree=create(h(ProductShell,{session,active,planned,children:'Synthetic workspace'}),{
  createNodeMock:element=>element.props?.id==='mobile-more-panel'?{querySelectorAll:()=>panelFocusables}:null
});});
const click=async id=>act(async()=>get(id).props.onClick());
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const output=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
  jest.clearAllMocks();tree=null;focusLog=[];panelFocusables=[];oldDocument=global.document;oldWindow=global.window;oldStorage=global.localStorage;
  media={matches:false,addEventListener:jest.fn(),removeEventListener:jest.fn()};
  global.window={matchMedia:jest.fn(()=>media)};
  global.document={body:{style:{overflow:'scroll'}},documentElement:{style:{overflow:'auto'},dataset:{appTheme:'light',familyTheme:'light'}},
    activeElement:null,querySelector:jest.fn(()=>({focus:()=>focusLog.push('desktop')}))};
  global.localStorage={setItem:jest.fn()};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}global.document=oldDocument;global.window=oldWindow;global.localStorage=oldStorage;});
describe('real staff navigation and keyboard interaction branches',()=>{
  it('filters only authorized destinations, including empty search and restoration',async()=>{
    await mount();
    await change('desktop-destination-search','Clinical');
    expect(output()).toContain('Clinical workspace');
    expect(output()).not.toContain('No authorized destinations match');
    await change('desktop-destination-search','NO-AUTHORIZED-ROUTE');
    expect(output()).toContain('No authorized destinations match your search.');
    await change('desktop-destination-search','   ');
    expect(get('nav-children')).toBeTruthy();
    expect(all('nav-applications')).toHaveLength(0);
  });
  it('collapses the rail while preserving current route and safe context switching',async()=>{
    await mount(s({contexts:[center,guardian]}),'children');
    expect(get('product-sidebar').props['data-collapsed']).toBe(false);
    expect(all('workspace-switcher').filter(x=>x.type==='a')).toHaveLength(1);
    await click('sidebar-collapse-toggle');
    expect(get('product-sidebar').props['data-collapsed']).toBe(true);
    expect(all('collapsed-workspace-switcher').filter(x=>x.type==='a')).toHaveLength(1);
    expect(all('workspace-switcher').filter(x=>x.type==='a')).toHaveLength(0);
    expect(get('nav-children').props['aria-current']).toBe('page');
    await click('sidebar-collapse-toggle');
    expect(all('workspace-switcher').filter(x=>x.type==='a')).toHaveLength(1);
  });
  it('exposes planned items as unavailable, not navigable permitted routes',async()=>{
    await mount(s(),'children',[{label:'Future consent workflow',unit:'M9',icon:Baby}]);
    expect(get('nav-planned-future-consent-workflow').props['aria-disabled']).toBe('true');
    expect(output()).toContain('Coming next');
  });
  it('opens and dismisses mobile navigation without persisting the search query',async()=>{
    await mount();
    await click('mobile-more-button');
    expect(get('mobile-more-sheet')).toBeTruthy();
    expect(global.document.body.style.overflow).toBe('hidden');
    await change('mobile-destination-search','unknown-page');
    expect(output()).toContain('No authorized destinations match your search.');
    await click('mobile-more-close');
    expect(all('mobile-more-sheet')).toHaveLength(0);
    expect(global.document.body.style.overflow).toBe('scroll');
    await click('mobile-more-button');
    expect(get('mobile-destination-search').props.value).toBe('');
  });
  it('dismisses mobile dialog on Escape and prevents its default',async()=>{
    await mount();await click('mobile-more-button');
    const event={key:'Escape',preventDefault:jest.fn()};
    await act(async()=>tree.root.findByProps({id:'mobile-more-panel'}).props.onKeyDown(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(all('mobile-more-sheet')).toHaveLength(0);
  });
  it('ignores non-Tab keys and prevents Tab escaping an empty modal',async()=>{
    await mount();await click('mobile-more-button');
    const panel=tree.root.findByProps({id:'mobile-more-panel'});
    const handler=panel.props.onKeyDown;
    const irrelevant={key:'ArrowDown',preventDefault:jest.fn()};
    await act(async()=>handler(irrelevant));
    expect(irrelevant.preventDefault).not.toHaveBeenCalled();
    const tab={key:'Tab',preventDefault:jest.fn(),shiftKey:false};
    await act(async()=>handler(tab));
    expect(tab.preventDefault).toHaveBeenCalled();
  });
  it('closes More when breakpoint switches to desktop and restores scrolling',async()=>{
    await mount();await click('mobile-more-button');
    const callback=media.addEventListener.mock.calls.find(([key])=>key==='change')[1];
    media.matches=true;
    await act(async()=>callback());
    expect(all('mobile-more-sheet')).toHaveLength(0);
    expect(focusLog).toContain('desktop');
    expect(media.removeEventListener).toHaveBeenCalledWith('change',callback);
    expect(global.document.documentElement.style.overflow).toBe('auto');
  });
  it('resets a drawer and search when the active tenant or role changes',async()=>{
    await mount();
    await click('mobile-more-button');
    await change('mobile-destination-search','schedule');
    const swapped=s({contexts:[guardian],activeContext:guardian,
      permissions:['family.activities.read','family.practice.read']});
    await act(async()=>tree.update(h(ProductShell,{session:swapped,active:'practice',planned:[],children:'Fictional guardian home'})));
    expect(all('mobile-more-sheet')).toHaveLength(0);
    expect(get('product-shell').props.className).toContain('theme-family-auto');
    expect(all('nav-clinical')).toHaveLength(0);
    expect(get('mobile-nav-select').props.value).toBe('/app/practice');
  });
  it('uses only permitted links inside More, then closes on route selection',async()=>{
    await mount(s({permissions:['center.children.read']}));
    await click('mobile-more-button');
    expect(all('mobile-more-clinical')).toHaveLength(0);
    expect(get('mobile-more-children')).toBeTruthy();
    await act(async()=>get('mobile-more-children').props.onClick());
    expect(all('mobile-more-sheet')).toHaveLength(0);
  });
});


describe('M5 shared dark-theme cross-role regression',()=>{
  const roles=['PLATFORM_ADMIN','CENTER_ADMIN','COORDINATOR','THERAPIST','SUPERVISOR','GUARDIAN'];
  it.each(roles)('keeps %s topbar/sidebar/mobile navigation on one theme',async role=>{
    const context=role==='PLATFORM_ADMIN'?{type:'platform',role}:{...center,role};
    const permissions=role==='GUARDIAN'?['family.activities.read','family.practice.read']:
      role==='PLATFORM_ADMIN'?['platform.applications.read']:
      ['center.children.read','center.schedule.read','center.activities.read','center.clinical.read'];
    await mount(s({activeContext:context,contexts:[context],permissions}),role==='GUARDIAN'?'practice':'children');
    const root=get('product-shell');
    expect(root.props.className).toContain(role==='GUARDIAN'?'theme-family-auto':'theme-clinical-auto');
    expect(get('product-top-bar').props.className).toContain(role==='GUARDIAN'?'bg-fam-surface':'bg-surface-white');
    expect(get('product-sidebar').props.className).toContain(role==='GUARDIAN'?'bg-fam-surface':'bg-surface-white');
    expect(get('mobile-nav').props.className).toContain(role==='GUARDIAN'?'bg-fam-surface':'bg-surface-white');
    await click('app-theme-toggle');
    expect(get('product-shell').props['data-theme']).toBe('dark');
    expect(get('app-theme-toggle').props['aria-pressed']).toBe(true);
    expect(global.document.documentElement.dataset.appTheme).toBe('dark');
    expect(global.document.documentElement.dataset.familyTheme).toBe('dark');
    expect(global.localStorage.setItem).toHaveBeenCalledWith('tb-app-theme','dark');
    await click('mobile-more-button');
    expect(get('mobile-more-panel')).toBeTruthy();
    expect(get('mobile-more-sheet')).toBeTruthy();
    await click('mobile-more-close');
    await click('app-theme-toggle');
    expect(get('product-shell').props['data-theme']).toBe('light');
    expect(get('app-theme-toggle').props['aria-label']).toBe('Switch to dark theme');
  });
  it('persists one dark preference across an authorized therapist-to-guardian context change',async()=>{
    await mount(s({contexts:[center,guardian]}),'children');
    await click('app-theme-toggle');
    await act(async()=>tree.update(h(ProductShell,{session:s({
      activeContext:guardian,contexts:[center,guardian],permissions:['family.activities.read','family.practice.read']
    }),active:'practice',planned:[],children:'Fictional guardian activity'})));
    expect(get('product-shell').props.className).toContain('theme-family-auto');
    expect(get('product-shell').props['data-theme']).toBe('dark');
    expect(get('app-theme-toggle').props['aria-pressed']).toBe(true);
    expect(all('nav-clinical')).toHaveLength(0);
  });
});

describe('real mobile dialog accessible focus-loop and expanded-only navigation',()=>{
  const focusable=()=>({getClientRects:()=>[{}],focus:jest.fn()});
  it('loops shift-Tab from first to last focusable control',async()=>{
    const first=focusable(),last=focusable();panelFocusables=[first,last];
    await mount();await click('mobile-more-button');
    global.document.activeElement=first;
    const e={key:'Tab',shiftKey:true,preventDefault:jest.fn()};
    await act(async()=>tree.root.findByProps({id:'mobile-more-panel'}).props.onKeyDown(e));
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(last.focus).toHaveBeenCalledTimes(1);
  });
  it('loops forward Tab from last to first and does not trap intermediate controls',async()=>{
    const first=focusable(),middle=focusable(),last=focusable();
    panelFocusables=[first,middle,last];
    await mount();await click('mobile-more-button');
    global.document.activeElement=last;
    const e={key:'Tab',shiftKey:false,preventDefault:jest.fn()};
    await act(async()=>tree.root.findByProps({id:'mobile-more-panel'}).props.onKeyDown(e));
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(first.focus).toHaveBeenCalledTimes(1);
    global.document.activeElement=middle;
    const other={key:'Tab',shiftKey:false,preventDefault:jest.fn()};
    await act(async()=>tree.root.findByProps({id:'mobile-more-panel'}).props.onKeyDown(other));
    expect(other.preventDefault).not.toHaveBeenCalled();
  });
  it('ignores controls hidden from the tab order and never leaks focus',async()=>{
    const hidden={getClientRects:()=>[],focus:jest.fn()};
    const visible=focusable();panelFocusables=[hidden,visible];
    await mount();await click('mobile-more-button');
    global.document.activeElement=visible;
    const e={key:'Tab',shiftKey:false,preventDefault:jest.fn()};
    await act(async()=>tree.root.findByProps({id:'mobile-more-panel'}).props.onKeyDown(e));
    expect(e.preventDefault).toHaveBeenCalled();
    expect(visible.focus).toHaveBeenCalled();
    expect(hidden.focus).not.toHaveBeenCalled();
  });
  it('supports a platform-only account with no center-bound clinical routes',async()=>{
    const platform={type:'platform',role:'PLATFORM_ADMIN'};
    await mount(s({activeContext:platform,contexts:[platform],permissions:['platform.applications.read']}),'applications');
    expect(get('nav-applications')).toBeTruthy();
    expect(all('nav-children')).toHaveLength(0);
    expect(get('product-shell').props.className).not.toContain('theme-family-auto');
  });
  it('displays no workspace selected without exposing role-dependent endpoints',async()=>{
    await mount(s({activeContext:null,contexts:[center,guardian],permissions:[]}));
    expect(get('active-context-label').props.children).toBe('No workspace selected');
    expect(all('nav-clinical')).toHaveLength(0);
    expect(get('mobile-nav-select')).toBeTruthy();
  });
});
