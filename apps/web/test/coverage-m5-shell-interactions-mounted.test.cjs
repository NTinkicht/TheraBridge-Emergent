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
let tree,oldDocument,oldWindow,media,focusLog;
const get=id=>tree.root.findByProps({'data-testid':id});
const all=id=>tree.root.findAllByProps({'data-testid':id});
const mount=async(session=s(),active='children',planned=[])=>act(async()=>{tree=create(h(ProductShell,{session,active,planned,children:'Synthetic workspace'}));});
const click=async id=>act(async()=>get(id).props.onClick());
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const output=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
  jest.clearAllMocks();tree=null;focusLog=[];oldDocument=global.document;oldWindow=global.window;
  media={matches:false,addEventListener:jest.fn(),removeEventListener:jest.fn()};
  global.window={matchMedia:jest.fn(()=>media)};
  global.document={body:{style:{overflow:'scroll'}},documentElement:{style:{overflow:'auto'}},
    activeElement:null,querySelector:jest.fn(()=>({focus:()=>focusLog.push('desktop')}))};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}global.document=oldDocument;global.window=oldWindow;});
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
