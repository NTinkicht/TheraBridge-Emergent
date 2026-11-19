// M5-WU4-D: source-executing component regression for progressively disclosed staff instructions.
// Safety remains immediately visible; family/full clinical cards keep expanded instructions.
// Synthetic fixtures only: no accepted image, publication, or clinical authorization implied.
const React = require('react');
const {create, act} = require('react-test-renderer');
const h = React.createElement;
const {ActivityCard} = require('../src/components/clinical/ActivityCard');

const item = {
  id: 'fictional-a', title: 'Synthetic turn taking', service: 'speech',
  ageBand: '3-6 years', minutes: 10, library: 'synthetic',
  materials: ['cards'], steps: ['Offer a card', 'Wait for a turn'],
  safety: ['Adult supervision required']
};
let tree;
afterEach(() => { if (tree) { act(() => tree.unmount()); tree = null; } });
const mount = (props) => act(() => { tree = create(h(ActivityCard, {t: item, ...props})); });
const all = (type) => tree.root.findAllByType(type);
const rendered = () => JSON.stringify(tree.toJSON());

describe('M5 staff catalogue progressive disclosure', () => {
  it('keeps both instructions accessible inside a native keyboard-operable disclosure', () => {
    mount({visual: true, compact: true});
    expect(all('details')).toHaveLength(1);
    expect(all('summary')).toHaveLength(1);
    expect(all('summary')[0].props.children.join('')).toBe('Instructions (2 steps)');
    expect(all('details')[0].findAllByType('li')).toHaveLength(2);
    expect(rendered()).toContain('Offer a card');
    expect(rendered()).toContain('Wait for a turn');
    expect(rendered()).toContain('Adult supervision required');
    expect(rendered()).toContain('No approved illustration available');
  });
  it('shows safety outside the collapsed instructions, not gated by disclosure', () => {
    mount({visual: true, compact: true});
    const safety = tree.root.findByProps({'data-testid':'activity-safety-fictional-a'});
    expect(safety.findAllByType('li')).toHaveLength(1);
    expect(all('details')[0].findAllByType('li')).toHaveLength(2);
  });
  it('keeps family instructions expanded by default and does not add staff image placeholders', () => {
    mount({tone:'family'});
    expect(all('details')).toHaveLength(0);
    expect(all('ol')).toHaveLength(1);
    expect(all('ol')[0].findAllByType('li')).toHaveLength(2);
    expect(rendered()).not.toContain('No approved illustration available');
  });
  it('does not show an empty instructions disclosure when steps are absent', () => {
    act(() => { tree = create(h(ActivityCard, {t:{...item,steps:[]},compact:true})); });
    expect(all('details')).toHaveLength(0);
    expect(rendered()).toContain('Adult supervision required');
  });
});
