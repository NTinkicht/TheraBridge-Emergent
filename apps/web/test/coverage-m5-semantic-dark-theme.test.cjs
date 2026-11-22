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
  it('retains WCAG AA contrast for shared navigation text and dark action fills',()=>{
    const luminance=hex=>{
      const channel=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
        .map(c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4));
      return channel[0]*.2126+channel[1]*.7152+channel[2]*.0722;
    };
    const ratio=(x,y)=>{const a=luminance(x),b=luminance(y);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
    const dark=darkSemanticOverrides;
    for(const ink of [dark.brand.ink,dark.brand.inkMuted]){
      expect(ratio(ink,dark.surface.white)).toBeGreaterThanOrEqual(4.5);
    }
    for(const fill of [dark.brand.action,dark.status.success,dark.status.caution,dark.status.danger]){
      expect(ratio('#0D1226',fill)).toBeGreaterThanOrEqual(4.5);
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
