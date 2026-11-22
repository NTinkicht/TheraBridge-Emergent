// M5 PR2: execute the real RepeatFields component (not just a source regex).
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/centers/kit',()=>({
  SelectField:({value,onChange,options,testId})=>h('select',{'data-testid':testId,value,
    onChange:e=>onChange(e.target.value)},options.map(o=>h('option',{key:o.value,value:o.value},o.label)))
}));
jest.mock('@/components/auth/Field',()=>({
  Field:({value,onChange,label,testId,type='text',min,max,step,required})=>h('label',null,
    label,h('input',{value,onChange,type,min,max,step,required,'data-testid':testId}))
}));
const {RepeatFields,recurringIntervalWeeks}=require('../src/components/operations/RepeatFields');
let tree;
const starting=()=>({mode:'none',intervalWeeks:'3',weekdays:[2],end:'count',count:'4',until:''});
const mount=async()=>act(async()=>{
 function Harness(){const [value,setValue]=React.useState(starting());return h('section',null,
   h(RepeatFields,{value,onChange:setValue}),
   h('output',{'data-testid':'actual-interval'},String(recurringIntervalWeeks(value))));
 }
 tree=create(h(Harness));
});
const get=id=>tree.root.findByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async id=>act(async()=>get(id).props.onClick());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('custom recurrence 1–4 weeks on shared booking field',()=>{
 it('shows custom weeks only when explicitly selected; keeps weekdays and end limits',async()=>{
   await mount();
   expect(get('actual-interval').props.children).toBe('null');
   expect(tree.root.findAllByProps({'data-testid':'book-repeat-custom-weeks'})).toHaveLength(0);
   const modes=get('book-repeat-select').findAllByType('option').map(x=>x.props.value);
   expect(modes).toEqual(['none','weekly','biweekly','custom']);
   await change('book-repeat-select','custom');
   expect(get('book-repeat-custom-weeks').props.min).toBe(1);
   expect(get('book-repeat-custom-weeks').props.max).toBe(4);
   expect(get('book-repeat-custom-weeks').props.required).toBe(true);
   expect(get('actual-interval').props.children).toBe('3');
   await change('book-repeat-custom-weeks','4');
   expect(get('actual-interval').props.children).toBe('4');
   await click('book-weekday-4');
   expect(get('book-weekday-4').props['aria-pressed']).toBe(true);
   expect(get('book-repeat-count')).toBeTruthy();
   await change('book-repeat-end','until');
   expect(get('book-repeat-until')).toBeTruthy();
 });
 it.each(['','0','5','1.5','2e0','03','abc','-1'])('refuses malformed custom week interval %s',async txt=>{
   expect(recurringIntervalWeeks({...starting(),mode:'custom',intervalWeeks:txt})).toBeUndefined();
 });
 it('keeps default weekly/biweekly intervals and never sends custom value in one-off',()=>{
   expect(recurringIntervalWeeks({...starting(),mode:'none'})).toBeNull();
   expect(recurringIntervalWeeks({...starting(),mode:'custom',intervalWeeks:'nope'})).toBeUndefined();
   expect(recurringIntervalWeeks({...starting(),mode:'weekly'})).toBe(1);
   expect(recurringIntervalWeeks({...starting(),mode:'biweekly'})).toBe(2);
   expect(recurringIntervalWeeks({...starting(),mode:'custom',intervalWeeks:'1'})).toBe(1);
   expect(recurringIntervalWeeks({...starting(),mode:'custom',intervalWeeks:'2'})).toBe(2);
   expect(recurringIntervalWeeks({...starting(),mode:'custom',intervalWeeks:'3'})).toBe(3);
   expect(recurringIntervalWeeks({...starting(),mode:'custom',intervalWeeks:'4'})).toBe(4);
 });
});
