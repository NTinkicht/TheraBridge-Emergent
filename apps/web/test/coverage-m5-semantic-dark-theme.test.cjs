// M5-32: shared CSS tokens must work for every role and opacity modifier.
// This is source-level colour qualification, not manual visual approval.
const { colors, cssVariables, themeColors, darkSemanticOverrides, appThemeCss, familyThemes } =
  require('../src/styles/tokens');

const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(' ');
describe('application-wide semantic light/dark palette',()=>{
  it('retains the original approved Direction B light tokens exactly',()=>{
    for(const [group,entries] of Object.entries(colors)){
      for(const [slot,hex] of Object.entries(entries)){
        expect(cssVariables[`--tb-${group}-${slot}`]).toBe(hex);
        expect(cssVariables[`--tb-rgb-${group}-${slot}`]).toBe(rgb(hex));
      }
    }
  });
  it('gives every shared light utility a real alpha-aware dark-compatible CSS variable',()=>{
    for(const [group,entries] of Object.entries(colors)){
      for(const slot of Object.keys(entries)){
        expect(themeColors[group][slot]).toBe(`rgb(var(--tb-rgb-${group}-${slot}) / <alpha-value>)`);
      }
    }
  });
  it('switches both family and clinical semantic surfaces, never just a guardian header',()=>{
    const selector='html[data-app-theme="dark"] .theme-clinical-auto, html[data-app-theme="dark"] .theme-family-auto';
    const dark=appThemeCss[selector];
    expect(dark).toBeDefined();
    for(const [group,entries] of Object.entries(darkSemanticOverrides)){
      for(const [slot,hex] of Object.entries(entries)){
        expect(dark[`--tb-${group}-${slot}`]).toBe(hex);
        expect(dark[`--tb-rgb-${group}-${slot}`]).toBe(rgb(hex));
      }
    }
    for(const key of ['--tb-canvas-clinical','--tb-surface-white','--tb-border-light','--tb-brand-ink']){
      expect(dark[key]).not.toBe(cssVariables[key]);
    }
    expect(familyThemes.dark.canvas).toBe('#0D1226');
    expect(familyThemes.dark.accent).toBe('#5CCFDB');
  });
});
