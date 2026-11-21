// M4-08 consolidated executable workspace coverage.
// Render actual Next route modules for distinct synthetic operational states.
// Workspace authentication is replaced by a fixture at the boundary only: this
// suite verifies page behavior, NOT server authorization or browser interactions.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
let mockState={data:null,failed:false};
let mockSession={
  csrfToken:'',
  user:{id:'fake-user',displayName:'Fictional Staff',email:'nobody@example.invalid'},
  contexts:[],
  activeContext:{type:'center',role:'THERAPIST',centerId:'synthetic-center',membershipId:'fake-membership',
    centerName:'Fictional Center',timezone:'Asia/Dubai'},
  permissions:[],
};
const mockRefresh=jest.fn();
jest.mock('@/components/centers/kit',()=>{
  const actual=jest.requireActual('@/components/centers/kit');
  const React=require('react');
  return {
    ...actual,
    Workspace:({children,active,permission})=>React.createElement('main',{
      'data-testid':'synthetic-workspace',
      'data-active':active,
      'data-permission-required':permission,
    },typeof children==='function'?children(mockSession,()=>{}):children),
    useLoad:()=>({...mockState,reload:mockRefresh,setData:jest.fn()}),
  };
});
jest.mock('next/navigation',()=>({
  useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
  usePathname:()=>'/app',
  useSearchParams:()=>new URLSearchParams(),
}));
const {setCenterTz}=require('../src/lib/operations');
const pages=[
  ['clinical','center.clinical.read',require('../src/app/app/clinical/page').default],
  ['children','center.children.read',require('../src/app/app/children/page').default],
  ['team','center.staff.read',require('../src/app/app/team/page').default],
  ['schedule','center.schedule.read',require('../src/app/app/schedule/page').default],
  ['progress','center.clinical.read',require('../src/app/app/progress/page').default],
  ['governance','center.clinical.read',require('../src/app/app/governance/page').default],
  ['access-review','center.governance.read',require('../src/app/app/access-review/page').default],
  ['family-progress','family.progress.demo',require('../src/app/app/family-progress/page').default],
  ['practice','family.practice.read',require('../src/app/app/practice/page').default],
  ['practice-feedback','center.practice.read',require('../src/app/app/practice-feedback/page').default],
  ['setup','center.setup.manage',require('../src/app/app/setup/page').default],
  ['centers','platform.centers.read',require('../src/app/app/centers/page').default],
  ['center','center.settings.read',require('../src/app/app/center/page').default],
  ['profile','center.profile.self',require('../src/app/app/profile/page').default],
  ['activities','center.activities.read|family.activities.read',require('../src/app/app/activities/page').default],
];
const render=(Page)=>renderToStaticMarkup(h(Page));
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
beforeEach(()=>{
  mockState={data:null,failed:false};
  mockSession={
    csrfToken:'',user:{id:'fake-user',displayName:'Fictional Staff',email:'nobody@example.invalid'},
    contexts:[],
    activeContext:{type:'center',role:'THERAPIST',centerId:'synthetic-center',
      membershipId:'fake-membership',centerName:'Fictional Center',timezone:'Asia/Dubai'},
    permissions:[],
  };
  mockRefresh.mockClear();
});
describe('M4-08 actual application route fallbacks, source-executed and denominator-preserving',()=>{
  test.each(pages)('%s renders its loading state in the correct workspace', (route,permission,Page)=>{
    mockState={data:null,failed:false};
    const markup=render(Page);
    expect(markup).toContain('data-testid="synthetic-workspace"');
    expect(markup).toContain('data-active="'+route+'"');
    expect(markup).toContain('data-permission-required="'+permission+'"');
    expect(markup).toMatch(/loading|Loading|aria-busy|animate-pulse/);
    expect(markup).not.toContain('fake-patient-not-authorized');
  });
  test.each(pages)('%s renders a retryable read-only failure, never fabricated data',(route,permission,Page)=>{
    mockState={data:null,failed:true};
    const markup=render(Page);
    expect(markup).toContain('data-testid="synthetic-workspace"');
    expect(markup).toContain('data-active="'+route+'"');
    expect(markup).toMatch(/role="alert"|Retry|retry|couldn.t load|didn.t respond/);
    expect(markup).not.toContain('fake-patient-not-authorized');
  });
});
describe('M4-08 cross-role synthetic read-only empty states',()=>{
  it('the clinical page displays assigned-child empty state without creating drafts',()=>{
    mockState={data:{items:[]},failed:false};
    const out=render(pages.find(x=>x[0]==='clinical')[2]);
    expect(out).toContain('No children assigned');
    expect(out).not.toContain('clinical-child-');
  });
  it('the guardian home practice hides all unassigned or unavailable activities',()=>{
    mockSession.activeContext.role='GUARDIAN';
    mockState={data:{children:[],gates:{practiceDemo:false},today:'2026-11-10',
      week:{start:'2026-11-09',days:['2026-11-09','2026-11-10','2026-11-11','2026-11-12',
       '2026-11-13','2026-11-14','2026-11-15']}},failed:false};
    const out=render(pages.find(x=>x[0]==='practice')[2]);
    expect(out).toContain('Home practice');
    expect(out).toContain('Sample activities only');
    expect(out).not.toContain('practice-activity-fake');
  });
  it('family messaging is explicitly blocked independent of role fixture',()=>{
    const MessagesPage=require('../src/app/app/messages/page').default;
    for(const role of ['GUARDIAN','THERAPIST','CENTER_ADMIN']){
      mockSession.activeContext.role=role;
      const out=render(MessagesPage);
      expect(out).toContain('Family messaging is unavailable in this demo');
      expect(out).toContain('No messages can be viewed or sent');
      expect(out).not.toContain('Send message');
    }
  });
});
