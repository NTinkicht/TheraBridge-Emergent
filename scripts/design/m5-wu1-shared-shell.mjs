/**
 * M5 WU1 — actual seven-role × five-width shared-shell browser qualification.
 * Executes only in isolated synthetic CI as part of the pre-existing real
 * browser audit; this is NOT visual/assistive-technology/owner acceptance.
 * No screenshots, session cookies, user names or DOM text enter this receipt.
 */
import assert from 'node:assert/strict';
import { PERSONAS, VIEWPORTS } from '../qa/m5-route-audit.mjs';
import { contrastRatio } from './m5-shared-guardian-browser.mjs';

const ROLES = new Set(PERSONAS.map(persona => persona.id));
const WIDTHS = new Set(VIEWPORTS);
const OUTPUT = '/tmp/therabridge-m5-wu1-cross-screen-shell.json';
const REQUIRED = Object.freeze([
  'persona', 'width', 'route', 'theme', 'surfaces', 'contrast',
  'overflow', 'keyboard', 'mobileDrawer', 'desktopRail', 'persisted',
]);
const exact = (object, keys) =>
  object !== null && typeof object === 'object' && !Array.isArray(object) &&
  Object.getPrototypeOf(object) === Object.prototype &&
  Reflect.ownKeys(object).length === keys.length &&
  keys.every(key => Object.hasOwn(object, key));

export function validateSharedShellReceipt(receipt) {
  if (!exact(receipt, ['schemaVersion','environment','evidenceType','governance','summary','observations']) ||
      receipt.schemaVersion !== 1 || receipt.environment !== 'ISOLATED_SYNTHETIC_CI' ||
      receipt.evidenceType !== 'AUTOMATED_ROLE_SHELL_NOT_HUMAN_ACCESSIBILITY' ||
      !exact(receipt.governance, ['clinicalGate','screenReaderManual','ownerSignoff','realUsability']) ||
      receipt.governance.clinicalGate !== 'NO_GO_G2_G2b' ||
      receipt.governance.screenReaderManual !== 'NOT_RUN' ||
      receipt.governance.ownerSignoff !== 'NOT_OBTAINED' ||
      receipt.governance.realUsability !== 'NOT_RUN' ||
      !exact(receipt.summary, ['observations','failed','screenshotsArchived']) ||
      receipt.summary.observations !== PERSONAS.length * VIEWPORTS.length ||
      receipt.summary.failed !== 0 || receipt.summary.screenshotsArchived !== 0 ||
      !Array.isArray(receipt.observations) ||
      receipt.observations.length !== PERSONAS.length * VIEWPORTS.length) {
    throw new Error('Missing or falsely qualified WU1 role-shell browser evidence');
  }
  const seen = new Set();
  for (const record of receipt.observations) {
    if (!exact(record, REQUIRED) || typeof record.persona !== 'string' ||
        !ROLES.has(record.persona) || typeof record.width !== 'number' ||
        !Number.isInteger(record.width) || !WIDTHS.has(record.width) ||
        record.route !== '/app' || record.theme !== 'LIGHT_AND_DARK_VERIFIED' ||
        record.surfaces !== 'PASS' || record.contrast !== 'PASS' ||
        record.overflow !== 'NONE' || record.keyboard !== 'PASS' ||
        record.mobileDrawer !== (record.width < 768 ? 'PASS' : 'NOT_APPLICABLE') ||
        record.desktopRail !== (record.width >= 768 ? 'PASS' : 'NOT_APPLICABLE') ||
        record.persisted !== (record.width === 390 ? 'PASS' : 'NOT_APPLICABLE')) {
      throw new Error('Unknown, incomplete, sensitive or failed WU1 shell observation');
    }
    const key = record.persona + ':' + record.width;
    if (seen.has(key)) throw new Error('Duplicate WU1 role/viewport observation');
    seen.add(key);
  }
  if (seen.size !== PERSONAS.length * VIEWPORTS.length)
    throw new Error('Incomplete WU1 role and viewport evidence');
  return true;
}

/** Parse one opaque, outward 3px-or-wider browser-computed focus ring.
 * Reject low-alpha decorative shadows, inset/multiple rings and inferred CSS
 * tokens. This is an observed ring, not a source-level token assertion. */
export function parseOpaqueFocusShadow(value) {
  if (typeof value !== 'string') return null;
  const match=/^(rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\))\s+0px\s+0px\s+0px\s+(\d+(?:\.\d+)?)px$/.exec(value);
  if (!match) return null;
  const width=Number(match[2]);
  if (!Number.isFinite(width) || width < 3) return null;
  return {color:match[1],width};
}

export function buildSharedShellReceipt(observations) {
  const receipt = {
    schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
    evidenceType: 'AUTOMATED_ROLE_SHELL_NOT_HUMAN_ACCESSIBILITY',
    governance: {clinicalGate: 'NO_GO_G2_G2b',screenReaderManual: 'NOT_RUN',
      ownerSignoff: 'NOT_OBTAINED', realUsability: 'NOT_RUN'},
    summary: {observations: observations.length, failed: 0, screenshotsArchived: 0},
    observations,
  };
  validateSharedShellReceipt(receipt);
  return receipt;
}

async function apply(page, theme) {
  const toggle = page.getByTestId('app-theme-toggle');
  const pressed = theme === 'dark' ? 'true' : 'false';
  if (await toggle.getAttribute('aria-pressed') !== pressed) await toggle.click();
  await page.waitForFunction(expected => {
    const root = document.documentElement.dataset;
    const shell = document.querySelector('[data-testid="product-shell"]');
    // With no stored preference, the prepaint bootstrap legitimately leaves
    // attributes unset and the shell defaults to light. A toggled dark value
    // MUST be explicit in both dataset slots.
    return (root.appTheme ?? 'light') === expected &&
      (root.familyTheme ?? 'light') === expected &&
      shell?.getAttribute('data-theme') === expected;
  }, theme, { timeout: 7000, polling: 100 });
  // Theme state may update before real computed CSS colors have settled.
  // An incorrect stylesheet still fails after the finite 7-second deadline.
  await page.waitForFunction(() => {
    const shell = document.querySelector('[data-testid="product-shell"]');
    const header = shell?.querySelector('[data-testid="product-top-bar"]');
    if (!shell || !header) return false;
    const family = shell.matches('.theme-family-auto');
    const shellStyle = getComputedStyle(shell);
    const headerStyle = getComputedStyle(header);
    const rgb = value => {
      const short = String(value ?? '').trim().replace('#','');
      const full = short.length === 3 ? short.split('').map(x => x+x).join('') : short;
      if (!/^[0-9a-f]{6}$/i.test(full)) return null;
      return 'rgb(' + [0,2,4].map(i => parseInt(full.slice(i,i+2),16)).join(', ') + ')';
    };
    const surface = rgb(shellStyle.getPropertyValue(family ? '--fam-surface' : '--tb-surface-white'));
    const canvas = rgb(shellStyle.getPropertyValue(family ? '--fam-canvas' : '--tb-canvas-clinical'));
    return Boolean(surface && canvas &&
      headerStyle.backgroundColor === surface &&
      shellStyle.backgroundColor === canvas);
  }, null, {timeout:7000,polling:100});
  return page.evaluate(() => {
    const get = id => document.querySelector('[data-testid="' + id + '"]');
    const shell = get('product-shell');
    const header = get('product-top-bar');
    const nav = window.innerWidth < 768 ? get('mobile-nav') : get('product-sidebar');
    const visible = element => Boolean(element && element.getClientRects().length);
    if (!visible(shell) || !visible(header) || !visible(nav))
      throw Error('Shared shell header/navigation absent in selected viewport');
    const style = element => getComputedStyle(element);
    return {
      headerBackground: style(header).backgroundColor,
      headerForeground: style(header).color,
      navBackground: style(nav).backgroundColor,
      navForeground: style(nav).color,
      canvasBackground: style(shell).backgroundColor,
      // Non-identifying computed design-token diagnostics. Never DOM text.
      semanticSurfaceRgb: style(shell).getPropertyValue('--tb-rgb-surface-white').trim(),
      semanticSurfaceHex: style(shell).getPropertyValue('--tb-surface-white').trim(),
      headerSemanticSurfaceHex: style(header).getPropertyValue('--tb-surface-white').trim(),
      headerSemanticSurfaceRgb: style(header).getPropertyValue('--tb-rgb-surface-white').trim(),
      headerMatchesOverride: header.matches('html[data-app-theme="dark"] .theme-clinical-auto .bg-surface-white'),
      matchedDarkRule: document.documentElement.matches('[data-app-theme="dark"]') &&
        shell.matches('.theme-clinical-auto, .theme-family-auto'),
      mainCount: document.querySelectorAll('main#main').length,
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    };
  });
}

export async function observeSharedShell(page, persona, width) {
  assert(ROLES.has(persona) && WIDTHS.has(width), 'Unknown role or viewport');
  assert.equal(new URL(page.url()).pathname, '/app', 'WU1 shell requires exact authorized home route');
  const light = await apply(page, 'light');
  const dark = await apply(page, 'dark');
  for (const observed of [light, dark]) {
    assert.equal(observed.viewport, width, 'Incorrect measured viewport');
    assert.equal(observed.mainCount, 1, 'Exactly one accessible main landmark');
    assert(observed.document <= width + 1, 'Shared shell creates horizontal overflow');
    assert(contrastRatio(observed.headerForeground, observed.headerBackground) >= 4.5,
      'Shared header text insufficient contrast');
    assert(contrastRatio(observed.navForeground, observed.navBackground) >= 4.5,
      'Shared navigation text insufficient contrast');
  }
  for (const key of ['headerBackground','navBackground','canvasBackground']) {
    let cssRuleFound='NOT_INSPECTED';
    if (light[key] === dark[key]) {
      cssRuleFound = await page.evaluate(() => {
        const target='.theme-clinical-auto .bg-surface-white';
        const scan=rules => {
          for (const rule of rules) {
            if (typeof rule.selectorText === 'string' && rule.selectorText.includes(target)) return true;
            if (rule.cssRules && scan(rule.cssRules)) return true;
          }
          return false;
        };
        for (const sheet of document.styleSheets) {
          try { if (scan(sheet.cssRules)) return 'PRESENT'; } catch { /* inaccessible external sheet */ }
        }
        return 'ABSENT';
      });
    }
    assert.notEqual(light[key], dark[key],
      'Theme switch failed to recolor shared shell ' + key +
      '; light=' + JSON.stringify({
        surfaceRgb:light.semanticSurfaceRgb,surfaceHex:light.semanticSurfaceHex,
        darkSelector:light.matchedDarkRule,header:light.headerBackground,canvas:light.canvasBackground,
      }) + '; dark=' + JSON.stringify({
        surfaceRgb:dark.semanticSurfaceRgb,surfaceHex:dark.semanticSurfaceHex,
        inheritedHeaderHex:dark.headerSemanticSurfaceHex,
        inheritedHeaderRgb:dark.headerSemanticSurfaceRgb,
        headerMatchesOverride:dark.headerMatchesOverride,
        cssRuleFound, darkSelector:dark.matchedDarkRule,
        header:dark.headerBackground,canvas:dark.canvasBackground,
      }));
  }
  const toggle = page.getByTestId('app-theme-toggle');
  await toggle.focus();
  assert(await toggle.evaluate(element => document.activeElement === element),
    'Theme control not keyboard focusable');

  // Codex P2: a resting dark border may suppress the only visible focus cue.
  const focusId = width < 768 ? 'mobile-nav-select' : 'desktop-destination-search';
  const focusControl = page.getByTestId(focusId);
  // CSS :focus-visible depends on input modality. After clicking the theme
  // toggle, programmatic focus alone may correctly show NO keyboard ring.
  // Establish genuine keyboard modality first, then inspect the focused
  // element's actual :focus-visible state and computed outline.
  await page.keyboard.press('Tab');
  await focusControl.focus();
  await page.waitForFunction(() => document.activeElement?.matches(':focus-visible') === true,
    null,{timeout:3000,polling:100});
  // Actual dark-theme painting and focus effects may settle after the initial
  // :focus-visible state becomes true. Wait only for a *computed* 3px ring,
  // never for the presence of an authored CSS rule, before strict validation.
  try {
    await page.waitForFunction(id => {
      const el=document.querySelector('[data-testid="' + id + '"]');
      if (!el || document.activeElement!==el || !el.matches(':focus-visible')) return false;
      const style=getComputedStyle(el);
      return (style.outlineStyle==='solid' && parseFloat(style.outlineWidth)>=3) ||
        /rgb\([^)]*\)\s+0px\s+0px\s+0px\s+[3-9](?:\.\d+)?px/.test(style.boxShadow);
    },focusId,{timeout:4000,polling:100});
  } catch (error) {
    if (error?.name!=='TimeoutError') throw error;
    // Final contrast-and-width assertion below records safe cascade diagnostics.
  }
  const focus = await focusControl.evaluate(el => {
    const style = getComputedStyle(el);
    // Safe, non-identifying cascade diagnostics are included only in a
    // failure message; never include DOM text, attributes, or private data.
    const matchedRules=[];
    const collect=rules=>{
      for(const rule of rules){
        if(rule.cssRules){try{collect(rule.cssRules);}catch{}}
        if(typeof rule.selectorText!=='string'||!rule.style)continue;
        const properties=['outline','outline-width','outline-style','outline-color'];
        if(!properties.some(name=>rule.style.getPropertyValue(name)))continue;
        try{
          if(!el.matches(rule.selectorText))continue;
          matchedRules.push({
            selector:rule.selectorText.slice(0,110),
            outline:rule.style.getPropertyValue('outline').slice(0,80),
            width:rule.style.getPropertyValue('outline-width').slice(0,30),
            important:rule.style.getPropertyPriority('outline-width')==='important',
          });
        }catch{}
      }
    };
    for(const sheet of document.styleSheets){
      try{collect(sheet.cssRules);}catch{}
    }
    return {active:document.activeElement===el,keyboardVisible:el.matches(':focus-visible'),
      outlineColor:style.outlineColor,outlineStyle:style.outlineStyle,
      outlineWidth:parseFloat(style.outlineWidth),
      boxShadow:style.boxShadow,
      rootTheme:document.documentElement.dataset.appTheme??'UNSET',
      scope:el.closest('.theme-clinical-auto')?'clinical':el.closest('.theme-family-auto')?'family':'none',
      globalRuleMatch:el.matches('html :is(input, select, textarea, [role="combobox"]):focus-visible'),
      darkRuleMatch:el.matches('html[data-app-theme="dark"] .theme-clinical-auto :is(input, select, textarea, [role="combobox"]):focus-visible'),
      matchedRules:matchedRules.slice(-12)};
  
  });
  // A native select can suppress the computed outline width (0px) while
  // :focus-visible is true. Enforce a real opaque 3px box-shadow ring as an
  // alternative rather than falsely accepting the old low-alpha ring.
  const ring=parseOpaqueFocusShadow(focus.boxShadow);
  const outlineOk=focus.outlineStyle==='solid' && focus.outlineWidth>=3 &&
    contrastRatio(focus.outlineColor,dark.navBackground)>=3;
  const shadowOk=!!ring && contrastRatio(ring.color,dark.navBackground)>=3;
  assert(focus.active && focus.keyboardVisible && (outlineOk || shadowOk),
    'Shared navigation keyboard focus requires an opaque >=3px, >=3:1 outline or shadow at ' +
    persona + '/' + width + ': ' + JSON.stringify(focus));

  if (width < 768) {
    const button = page.getByTestId('mobile-more-button');
    assert.equal(await button.getAttribute('aria-haspopup'), 'dialog');
    await button.click();
    const sheet = page.getByTestId('mobile-more-sheet');
    await sheet.waitFor({state: 'visible'});
    const modal = page.getByRole('dialog', {name: 'All navigation'});
    assert.equal(await modal.getAttribute('aria-modal'), 'true');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') ===
      'mobile-more-close', null, {timeout: 5000});
    // Verify real browser inert behavior, not aria-modal declaration alone.
    const background = await page.evaluate(() => {
      const ids=['skip-to-main','product-sidebar','product-top-bar','shell-breadcrumb','mobile-nav','mobile-bottom-nav'];
      const all=ids.every(id=>document.querySelector('[data-testid="'+id+'"]')?.inert===true) && document.getElementById('main')?.inert===true;
      document.querySelector('[data-testid="sign-out-button"]')?.focus();
      return {all,focusStayedInside:document.getElementById('mobile-more-panel')?.contains(document.activeElement)===true};
    });
    assert(background.all&&background.focusStayedInside,'Modal background must be inert and unable to receive focus');
    // Real keyboard-only dialog exit and return to the original invoker.
    await page.keyboard.press('Escape');
    await sheet.waitFor({state: 'detached'});
    assert(await button.evaluate(element => document.activeElement === element),
      'Mobile More must restore keyboard focus after Escape');
    assert(await page.evaluate(()=>!document.getElementById('main')?.inert && !document.querySelector('[data-testid="product-top-bar"]')?.inert && !document.querySelector('[data-testid="mobile-bottom-nav"]')?.inert),'Modal background interaction must be restored on close');
    // React cleans up the scroll lock in an effect after the dialog unmount.
    // Observe the real unlock without racing a queued passive cleanup effect.
    await page.waitForFunction(() =>
      document.body.style.overflow !== 'hidden' &&
      document.documentElement.style.overflow !== 'hidden',
      null, {timeout:5000,polling:100});
  } else {
    const rail = page.getByTestId('sidebar-collapse-toggle');
    await rail.click();
    assert.equal(await rail.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByTestId('product-sidebar').getAttribute('data-collapsed'), 'true');
    await rail.click();
    assert.equal(await rail.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByTestId('product-sidebar').getAttribute('data-collapsed'), 'false');
  }
  if (width === 390) {
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.getByTestId('product-shell').waitFor({state:'visible',timeout:12000});
    await page.waitForFunction(() =>
      document.documentElement.dataset.appTheme === 'dark' &&
      document.documentElement.dataset.familyTheme === 'dark' &&
      document.querySelector('[data-testid="product-shell"]')?.getAttribute('data-theme') === 'dark',
      null, {timeout:7000,polling:100});
  }
  return {persona,width,route:'/app',theme:'LIGHT_AND_DARK_VERIFIED',
    surfaces:'PASS',contrast:'PASS',overflow:'NONE',keyboard:'PASS',
    mobileDrawer:width<768?'PASS':'NOT_APPLICABLE',
    desktopRail:width>=768?'PASS':'NOT_APPLICABLE',
    persisted:width===390?'PASS':'NOT_APPLICABLE'};
}

export const SHARED_SHELL_OUTPUT = OUTPUT;
