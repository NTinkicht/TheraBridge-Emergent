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
  it('shared action-on-fill token meets WCAG AA in light and dark across staff and scheduling',()=>{
    const luminance=hex=>{
      const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
        .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
      return .2126*c[0]+.7152*c[1]+.0722*c[2];
    };
    const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
    expect(contrast(colors.brand.actionOn,colors.brand.action)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkSemanticOverrides.brand.actionOn,darkSemanticOverrides.brand.action)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF',darkSemanticOverrides.brand.action)).toBeLessThan(4.5);
    const fs=require('node:fs'),path=require('node:path');
    const button=fs.readFileSync(path.join(__dirname,'../src/components/design/ui.tsx'),'utf8');
    const schedule=fs.readFileSync(path.join(__dirname,'../src/app/app/schedule/page.tsx'),'utf8');
    expect(button).toContain('bg-brand-action text-brand-actionOn');
    expect(schedule).toContain('bg-brand-action text-brand-actionOn');
    expect(schedule).toContain('min-h-11 rounded-[8px]');
  });
  it('keeps every specialty activity tint readable against inherited dark clinical text',()=>{
    const text=darkSemanticOverrides.brand.ink;
    const muted=darkSemanticOverrides.brand.inkMuted;
    const luminance=hex=>{
      const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
        .map(n=>n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4));
      return .2126*c[0]+.7152*c[1]+.0722*c[2];
    };
    const ratio=(x,y)=>{
      const a=luminance(x),b=luminance(y);
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    };
    for(const key of ['speechTint','otTint','abaTint','physioTint','groupTint']){
      const tint=darkSemanticOverrides.specialty[key];
      expect(ratio(text,tint)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(muted,tint)).toBeGreaterThanOrEqual(4.5);
    }
    const fs=require('fs'),path=require('path');
    const source=fs.readFileSync(path.join(__dirname,'../src/components/clinical/ActivityCard.tsx'),'utf8');
    expect(source).toContain('specialtySurface(identities[0].family, true)');
    expect(source).toContain('specialtySurface(x.family, true)');
    expect(source).toContain('specialtySurface(x.family, false)');
    expect(source).not.toContain('background: tint ?? identities[0].tint');
  });
  it('shared ErrorState body uses theme-aware danger ink with readable light and dark contrast',()=>{
    const l=hex=>{
      const a=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
        .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
      return a[0]*.2126+a[1]*.7152+a[2]*.0722;
    };
    const contrast=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
    expect(contrast(colors.status.danger,colors.status.dangerSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkSemanticOverrides.status.danger,darkSemanticOverrides.status.dangerSurface)).toBeGreaterThanOrEqual(4.5);
    const fs=require('fs'),path=require('path');
    const states=fs.readFileSync(path.join(__dirname,'../src/components/design/states.tsx'),'utf8');
    expect(states).toContain("fam ? 'text-fam-muted' : 'text-status-danger'");
    expect(states).not.toContain("text-[#7A2630]");
  });
  it('clinical report and home-plan assist panels keep dark text and surfaces paired',()=>{
    const fs=require('fs'),path=require('path');
    for(const file of ['ReportDecisionAssist.tsx','HomePlanSyntheticAssist.tsx']){
      const src=fs.readFileSync(path.join(__dirname,'../src/components/clinical',file),'utf8');
      expect(src).toContain('bg-surface-white');
      expect(src).not.toMatch(/\\bbg-white\\b/);
      expect(src).toContain('text-brand-ink');
    }
    const canvas=darkSemanticOverrides.surface.white,ink=darkSemanticOverrides.brand.ink;
    const luminance=h=>{
      const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)
        .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
      return .2126*c[0]+.7152*c[1]+.0722*c[2];
    };
    const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
    expect(ratio(canvas,ink)).toBeGreaterThanOrEqual(4.5);
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
