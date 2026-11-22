// Owner's M5 feedback: source-executed regressions for shared presentation.
// Synthetic fixtures only; visual/AT human approval is still mandatory.
const React = require('react');
const { act, create } = require('react-test-renderer');
const { ActivityCard } = require('../src/components/clinical/ActivityCard');
const { colors } = require('../src/styles/tokens');
const h = React.createElement;
const fixture = { id:'activity-synthetic-01', title:'Fictional fine motor activity',
  service:'occupational', library:'synthetic', ageBand:'3-6 years', minutes:12,
  materials:['large blocks'], steps:['Prepare blocks','Take a turn'],
  safety:['Adult supervision'] };
let tree = null;
const mount = (overrides = {}, props = {}) => act(() => {
  tree = create(h(ActivityCard,{t:{...fixture,...overrides}, visual:true, compact:true, ...props}));
});
const byId = id => tree.root.findByProps({'data-testid':id});
afterEach(() => { if (tree) { act(() => tree.unmount()); tree = null; } });
describe('M5 owner-feedback activity-card layouts and specialty identity', () => {
  it('uses the established OT palette and retains a visible safety notice outside disclosure', () => {
    mount();
    expect(byId('activity-specialty-accent-activity-synthetic-01').props.style.background).toBe('var(--tb-specialty-ot)');
    expect(byId('activity-specialty-accent-activity-synthetic-01').props.style.background).not.toBe(colors.specialty.ot);
    expect(byId('activity-media-placeholder-activity-synthetic-01')).toBeTruthy();
    expect(byId('activity-safety-activity-synthetic-01').findAllByType('li')).toHaveLength(1);
    expect(tree.root.findAllByType('details')).toHaveLength(1);
  });
  it('uses role-independent semantic tint variables rather than light-only literal hex values', () => {
    mount();
    const surface = byId('activity-activity-synthetic-01').findAllByType('div')
      .find(node => node.props.style?.background === 'var(--tb-specialty-otTint)');
    expect(surface?.props.style.background).toBe('var(--tb-specialty-otTint)');
    expect(surface?.props.style.background).not.toBe(colors.specialty.otTint);
  });
  it('keeps multi-specialty gradient stops theme-aware for dark clinical shells', () => {
    mount({service:'speech',services:['speech','occupational']});
    const surface = byId('activity-activity-synthetic-01').findAllByType('div')
      .find(node => node.props.style?.background?.startsWith('linear-gradient(115deg'));
    expect(surface?.props.style.background).toContain('var(--tb-specialty-speechTint)');
    expect(surface?.props.style.background).toContain('var(--tb-specialty-otTint)');
    expect(surface?.props.style.background).not.toContain(colors.specialty.speechTint);
  });
  it('keeps a compact 4:3 thumbnail in list and a full-width visual in grid', () => {
    mount({}, {layout:'list'});
    expect(byId('activity-media-placeholder-activity-synthetic-01').props.className).toContain('sm:w-44');
    act(() => tree.unmount()); tree = null;
    mount({}, {layout:'grid'});
    expect(byId('activity-media-placeholder-activity-synthetic-01').props.className).toContain('max-h-48');
  });
  it('blends two existing approved specialty accents for a multi-service visual only', () => {
    mount({service:'speech',services:['speech','occupational'],library:'center'});
    const accent = byId('activity-specialty-accent-activity-synthetic-01').props.style.background;
    expect(accent).toContain('linear-gradient');
    expect(accent).toContain('var(--tb-specialty-speech)');
    expect(accent).toContain('var(--tb-specialty-ot)');
    expect(JSON.stringify(tree.toJSON())).toContain('Speech & language, Occupational therapy');
  });
  it('ignores unknown service aliases in a multi-service tint rather than inventing specialty tokens', () => {
    mount({services:['unknown', 'behavioral', 'behavioral'],materials:[],steps:[]});
    expect(byId('activity-specialty-accent-activity-synthetic-01').props.style.background).toBe('var(--tb-specialty-aba)');
    expect(tree.root.findAllByType('details')).toHaveLength(0);
    expect(byId('activity-safety-activity-synthetic-01')).toBeTruthy();
  });
  it('does not inject clinical colour claims or an unapproved image into family cards', () => {
    mount({library:'center',steps:[],safety:[]}, {tone:'family',visual:false,compact:false});
    expect(tree.root.findAllByProps({'data-testid':'activity-specialty-accent-activity-synthetic-01'})).toHaveLength(0);
    expect(tree.root.findAllByProps({'data-testid':'activity-media-placeholder-activity-synthetic-01'})).toHaveLength(0);
    expect(byId('activity-safety-activity-synthetic-01')).toBeTruthy();
  });
});
