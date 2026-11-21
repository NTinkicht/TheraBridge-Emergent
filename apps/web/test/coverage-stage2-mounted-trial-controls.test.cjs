// Stage 2: actual platform trial controls, boundary validation and error recovery.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let loadData,loadSetData,loadFail;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,
  useLoad:()=>({data:loadData,setData:loadSetData,failed:loadFail}),
  ReasonField:({value,onChange,testId})=>h('textarea',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  })};
});
jest.mock('@/components/design/states',()=>{
 const real=jest.requireActual('@/components/design/states');
 return {...real,Dialog:({open,title,children,footer,testId})=>open?
 h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/components/operations/Dashboards',()=>({
 TrialBanner:({trial})=>h('span',{'data-testid':'trial-status'},String(trial.daysLeft))
}));
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,platformTrial:jest.fn(),extendTrial:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {TrialCard}=require('../src/components/operations/TrialCard');
const trial=(changes={})=>({onTrial:true,endsAt:'2035-12-30',expired:false,
 daysLeft:14,therapistSeats:{used:1,limit:5},children:{used:1,limit:20},...changes});
let tree,error;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const mount=async()=>act(async()=>{tree=create(h(TrialCard,{centerId:'center-a',onError:error}));});
beforeEach(()=>{
 jest.clearAllMocks();opsApi.platformTrial.mockReset();opsApi.extendTrial.mockReset();
 loadData=trial();loadFail=false;loadSetData=jest.fn(v=>{loadData=v;});
 error=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real platform trial extension controls',()=>{
 it('does not pretend to have trial data before server response',async()=>{
  loadData=null;await mount();
  expect(find('platform-trial')).toHaveLength(0);
  expect(opsApi.extendTrial).not.toHaveBeenCalled();
 });
 it('opens dialog but does not send an unconfirmed extension',async()=>{
  await mount();await click('trial-extend-button');
  expect(get('trial-extend-dialog')).toBeTruthy();
  expect(opsApi.extendTrial).not.toHaveBeenCalled();
 });
 it.each(['0','91','-1','1.5','NaN'])('rejects invalid extension days: %s',async(days)=>{
  await mount();await click('trial-extend-button');
  await change('trial-extend-days-input',days);
  await change('trial-extend-reason','Synthetic requirement');
  await click('trial-extend-confirm');
  expect(opsApi.extendTrial).not.toHaveBeenCalled();
  expect(get('trial-extend-error')).toBeTruthy();
 });
 it('requires at least three non-space reason characters',async()=>{
  await mount();await click('trial-extend-button');
  await change('trial-extend-reason',' x ');
  await click('trial-extend-confirm');
  expect(opsApi.extendTrial).not.toHaveBeenCalled();
  expect(get('trial-extend-error')).toBeTruthy();
 });
 it('sends exact duration and trimmed reason, commits only server response',async()=>{
  opsApi.extendTrial.mockResolvedValue(trial({daysLeft:21}));
  await mount();await click('trial-extend-button');
  await change('trial-extend-days-input','7');
  await change('trial-extend-reason','  Synthetic plan extension  ');
  await click('trial-extend-confirm');
  expect(opsApi.extendTrial).toHaveBeenCalledWith('center-a',7,'Synthetic plan extension');
  expect(loadSetData).toHaveBeenCalledWith(expect.objectContaining({daysLeft:21}));
  expect(find('trial-extend-dialog')).toHaveLength(0);
 });
 it('shows an API rejection and permits correction before retry',async()=>{
  opsApi.extendTrial.mockRejectedValueOnce({status:422,message:'Synthetic policy rejection'})
   .mockResolvedValueOnce(trial({daysLeft:28}));
  await mount();await click('trial-extend-button');
  await change('trial-extend-reason','Synthetic approved rationale');
  await click('trial-extend-confirm');
  expect(get('trial-extend-error')).toBeTruthy();
  expect(loadSetData).not.toHaveBeenCalled();
  await click('trial-extend-confirm');
  expect(opsApi.extendTrial).toHaveBeenCalledTimes(2);
  expect(loadSetData).toHaveBeenCalledTimes(1);
 });
});
