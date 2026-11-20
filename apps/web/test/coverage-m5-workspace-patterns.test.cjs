// M5-04: mount source components with synthetic, non-clinical records.
const React = require('react');
const Renderer = require('react-test-renderer');
const { act, create } = Renderer;
const h = React.createElement;
const { WorkspaceTabs, DisclosureSection, TaskStepper, CompactTable } = require('../src/components/design/workspace-patterns');

let tree;
const mount = async (component, props) => act(async () => { tree = create(h(component, props)); });
const output = () => JSON.stringify(tree.toJSON());
afterEach(async () => { if (tree) { await act(async () => tree.unmount()); tree = null; } });

describe('M5-04 shared workspace patterns', () => {
  const tabs = [
    { id: 'summary', label: 'Overview', content: h('p', null, 'Synthetic overview') },
    { id: 'care', label: 'Care', content: h('p', null, 'Synthetic care') },
    { id: 'restricted', label: 'Restricted', content: 'Must not appear', disabled: true },
  ];
  it('renders only the selected authorized tab panel', async () => {
    await mount(WorkspaceTabs, { tabs, selected: 'summary', onSelect: jest.fn(), label: 'Child areas' });
    expect(output()).toContain('Synthetic overview');
    expect(output()).not.toContain('Synthetic care');
    expect(output()).not.toContain('Must not appear');
    const nodes = tree.root.findAllByProps({ role: 'tab' });
    expect(nodes.map(x => x.props['aria-selected'])).toEqual([true, false, false]);
    expect(nodes[2].props.disabled).toBe(true);
    expect(nodes[0].props['aria-controls']).toBeTruthy();
    expect(nodes[1].props['aria-controls']).toBeUndefined();
    expect(nodes[2].props['aria-controls']).toBeUndefined();
    expect(tree.root.findAllByProps({role:'tabpanel'})).toHaveLength(1);
  });
  it('does not reveal a stale or unauthorized panel when selection becomes inaccessible', async () => {
    await mount(WorkspaceTabs, { tabs, selected: 'summary', onSelect: jest.fn(), label: 'Child areas' });
    await act(async () => tree.update(h(WorkspaceTabs, { tabs, selected: 'restricted', onSelect: jest.fn(), label: 'Child areas' })));
    expect(output()).toContain('No accessible section');
    expect(output()).not.toContain('Synthetic overview');
    expect(output()).not.toContain('Must not appear');
    expect(tree.root.findAllByProps({role:'tabpanel'})).toHaveLength(0);
    expect(tree.root.findAllByProps({role:'tab'}).every(node => node.props['aria-controls'] === undefined)).toBe(true);
  });
  it('fails closed for duplicated or unsafe tab identities after a scoped role switch', async () => {
    const select = jest.fn();
    await mount(WorkspaceTabs, { tabs, selected: 'summary', onSelect: select, label: 'Child areas' });
    for (const malformed of [
      [tabs[0], { ...tabs[1], id: 'summary' }],
      [{ ...tabs[0], id: 'private panel' }, tabs[1]],
      [{ ...tabs[0], id: '../cross-scope' }, tabs[1]],
      [{ ...tabs[0], id: '' }, tabs[1]],
    ]) {
      await act(async () => tree.update(h(WorkspaceTabs, { tabs: malformed, selected: malformed[0].id, onSelect: select, label: 'Child areas' })));
      expect(output()).toContain('No accessible section is available');
      expect(output()).not.toContain('Synthetic overview');
      expect(output()).not.toContain('Synthetic care');
      expect(tree.root.findAllByProps({ role: 'tabpanel' })).toHaveLength(0);
      expect(tree.root.findAllByProps({ role: 'tab' })).toHaveLength(0);
    }
    expect(select).not.toHaveBeenCalled();
  });
  it('supports click and Home / End / arrows without invoking a disabled tab', async () => {
    const select = jest.fn();
    await mount(WorkspaceTabs, { tabs, selected: 'summary', onSelect: select, label: 'Child areas' });
    const nodes = tree.root.findAllByProps({ role: 'tab' });
    await act(async () => nodes[1].props.onClick());
    expect(select).toHaveBeenCalledWith('care');
    const original = global.document;
    global.document = { getElementById: () => ({ focus: jest.fn() }) };
    try {
      await act(async () => nodes[0].props.onKeyDown({ key: 'End', preventDefault: jest.fn() }));
      expect(select).toHaveBeenLastCalledWith('care');
      await act(async () => nodes[1].props.onKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() }));
      expect(select).toHaveBeenLastCalledWith('summary');
    } finally { global.document = original; }
  });
  it('uses family semantic slots instead of a violet selected action', async () => {
    await mount(WorkspaceTabs, { tabs, selected: 'care', onSelect: jest.fn(), label: 'Family areas', tone: 'family' });
    expect(output()).toContain('border-fam-accent');
    expect(output()).not.toContain('brand-violet');
    expect(output()).not.toContain('Synthetic overview');
  });
  it('uses native disclosure semantics with supporting summary and expandable content', async () => {
    await mount(DisclosureSection, { title: 'Session details', summary: 'Synthetic example', children: 'Private disclosure', openByDefault: true });
    const details = tree.root.findByType('details');
    expect(details.props.open).toBe(true);
    expect(tree.root.findByType('summary')).toBeTruthy();
    await act(async () => details.props.onToggle({currentTarget:{open:false}}));
    expect(tree.root.findByType('details').props.open).toBe(false);
    await act(async () => tree.update(h(DisclosureSection, {title:'Session details', summary:'Synthetic example', children:'Private disclosure', openByDefault:true})));
    expect(tree.root.findByType('details').props.open).toBe(false);
    expect(output()).toContain('Private disclosure');
  });
  it('shows blocked and current task state as text, not color alone', async () => {
    await mount(TaskStepper, { steps: [
      { id: 'one', label: 'Prepare', status: 'complete' },
      { id: 'two', label: 'Review', status: 'current' },
      { id: 'three', label: 'Release', status: 'blocked', description: 'Approval unavailable' },
    ] });
    expect(output()).toContain('Current step');
    expect(output()).toContain('Blocked');
    expect(output()).toContain('Approval unavailable');
    expect(tree.root.findAllByProps({'aria-current':'step'})).toHaveLength(1);
  });
  it('renders caption, scoped headers, empty state, and synthetic records in a scroll region', async () => {
    const columns = [{id:'name',label:'Name'},{id:'status',label:'Status'}];
    await mount(CompactTable, { columns, rows: [], caption:'Synthetic activity summary' });
    expect(tree.root.findByType('caption').props.children).toBe('Synthetic activity summary');
    expect(tree.root.findByProps({role:'region'}).props.tabIndex).toBe(0);
    expect(tree.root.findByProps({role:'region'}).props['aria-label']).toContain('scroll horizontally');
    expect(output()).toContain('No records available');
    await act(async () => tree.update(h(CompactTable, { columns, rows:[{id:'a',cells:{name:'Demo item',status:'Pending'}}], caption:'Synthetic activity summary',tone:'family' })));
    expect(output()).toContain('Demo item');
    expect(output()).not.toContain('No records available');
    expect(output()).toContain('border-fam-border');
  });
});
