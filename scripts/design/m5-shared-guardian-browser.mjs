/**
 * M5-04/09 synthetic guardian browser qualification.
 * True observations: five widths × two applied theme modes, keyboard skip
 * link, live sibling announcement and accessible main landmark.
 * NOT an NVDA/VoiceOver or real-user usability acceptance. Screenshot buffers
 * are hashed in memory and immediately discarded; never output UI content.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { observeSettledPage } from './m5-browser-observe.mjs';

export const SHARED_UX_WIDTHS = Object.freeze([320,390,768,1024,1440]);
const ORIGIN='http://127.0.0.1:3000';
const GUARDIAN='mariam.ahmed@childrens-home.therabridge.test';
const OUTPUT='/tmp/therabridge-m5-shared-guardian-ux.json';
const HEX=/^[a-f0-9]{64}$/;
const safeKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
  Object.getPrototypeOf(o)===Object.prototype &&
  Reflect.ownKeys(o).length===keys.length && keys.every(k=>Object.hasOwn(o,k));

export function contrastRatio(foreground,background){
  // Chromium computed colors; the function deliberately refuses transparency,
  // system-colors, non-rgb formats and non-numeric values.
  const rgb=color=>{
    if(typeof color!=='string')throw new TypeError('computed color must be a string');
    const match=/^rgb\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*\)$/.exec(color);
    if(!match)throw new TypeError('only opaque browser-computed RGB colors are admitted');
    return match.slice(1).map(Number).map(c=>{
      if(c>255)throw new RangeError('invalid RGB color');
      const x=c/255;
      return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;
    });
  };
  const a=rgb(foreground),b=rgb(background);
  const l=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
  return (Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
}

export function validateSharedGuardianReceipt(receipt){
  if(!safeKeys(receipt,['schemaVersion','environment','evidenceType','governance','summary','observations'])||
     receipt.schemaVersion!==1||receipt.environment!=='ISOLATED_SYNTHETIC_CI'||
     receipt.evidenceType!=='AUTOMATED_BROWSER_NOT_HUMAN_ACCESSIBILITY'||!safeKeys(receipt.governance,
       ['clinicalGate','screenReaderAcceptance','humanUsability','ownerSignoff','realTaskTiming','visualApproval'])||
     receipt.governance.clinicalGate!=='NO_GO_G2_G2b'||
     receipt.governance.screenReaderAcceptance!=='NOT_RUN'||
     receipt.governance.humanUsability!=='NOT_RUN'||
     receipt.governance.ownerSignoff!=='NOT_OBTAINED'||
     receipt.governance.realTaskTiming!=='NOT_RUN'||
     receipt.governance.visualApproval!=='NOT_OBTAINED'||
     !safeKeys(receipt.summary,['observations','failed','screenshotsArchived'])||
     receipt.summary.observations!==SHARED_UX_WIDTHS.length||receipt.summary.failed!==0||
     receipt.summary.screenshotsArchived!==0||
     !Array.isArray(receipt.observations)||receipt.observations.length!==SHARED_UX_WIDTHS.length){
    throw new Error('Synthetic guardian receipt is incomplete or falsely approved');
  }
  const used=new Set();
  for(const item of receipt.observations){
    if(!safeKeys(item,['persona','width','route','status','overflow','keyboardSkip','siblingLiveRegion',
        'contrastLight','contrastDark','lightSha256','darkSha256','siblingControls'])||
       item.persona!=='guardian'||item.route!=='/app'||
       typeof item.width!=='number'||!SHARED_UX_WIDTHS.includes(item.width)||used.has(item.width)||
       item.status!=='ROUTE_RENDERED'||item.overflow!=='NONE'||item.keyboardSkip!=='PASS'||
       item.siblingLiveRegion!=='PRESENT'||
       !['OBSERVED','NOT_APPLICABLE_IN_SEED'].includes(item.siblingControls)||
       typeof item.contrastLight!=='number'||item.contrastLight<4.5||!Number.isFinite(item.contrastLight)||
       typeof item.contrastDark!=='number'||item.contrastDark<4.5||!Number.isFinite(item.contrastDark)||
       typeof item.lightSha256!=='string'||!HEX.test(item.lightSha256)||
       typeof item.darkSha256!=='string'||!HEX.test(item.darkSha256)) {
      throw new Error('Missing, sensitive or failed five-width guardian browser observation');
    }
    used.add(item.width);
  }
  if(used.size!==SHARED_UX_WIDTHS.length)throw new Error('Guardian viewport matrix incomplete');
  return true;
}

async function setTheme(page,mode){
  const themeButton=page.getByTestId('app-theme-toggle');
  if((await themeButton.getAttribute('aria-pressed'))!==(mode==='dark'?'true':'false')){
    await themeButton.click();
  }
  await page.waitForFunction(theme=>{
    const root=document.documentElement.dataset;
    // Default light mode is valid before the first user preference has
    // ever been stored: bootstrap leaves both data attributes unset.
    // Once toggled, both attributes must agree with the visible shell.
    const app=root.appTheme??'light';
    const family=root.familyTheme??'light';
    return app===theme && family===theme &&
      document.querySelector('[data-testid="product-shell"]')?.getAttribute('data-theme')===theme;
  },mode,{timeout:6000});
}

async function contrastAndDigest(page){
  const colors=await page.getByTestId('family-home').evaluate(el=>{
    const style=getComputedStyle(el);
    return {ink:style.color,bg:style.backgroundColor};
  });
  const ratio=contrastRatio(colors.ink,colors.bg);
  assert(ratio>=4.5,'Family surface text must meet WCAG 2.2 AA normal-text contrast');
  const screenshot=await page.screenshot({fullPage:true,animations:'disabled'});
  return {contrast:Number(ratio.toFixed(3)),sha256:createHash('sha256').update(screenshot).digest('hex')};
}

export async function runSharedGuardianQualification({passwords,output}={}){
  const db=new URL(process.env.DATABASE_URL||'');
  if(process.env.DEPLOYMENT_ENV!=='ci'||!['localhost','127.0.0.1'].includes(db.hostname)||
     !db.pathname.endsWith('_demo_test')||typeof passwords?.[GUARDIAN]!=='string'||
     output!==OUTPUT){
    throw new Error('Guardian qualification requires isolated synthetic CI and ephemeral in-memory credentials');
  }
  const browser=await chromium.launch({args:['--disable-dev-shm-usage']});
  const observations=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:850},reducedMotion:'reduce'});
    try{
      const page=await context.newPage();
      await page.goto(ORIGIN+'/login',{waitUntil:'domcontentloaded'});
      await page.getByTestId('login-email-input').fill(GUARDIAN);
      await page.getByTestId('login-password-input').fill(passwords[GUARDIAN]);
      await page.getByTestId('login-submit-button').click();
      await page.waitForFunction(()=>location.pathname==='/app',{timeout:20000});
      const role=await page.evaluate(async()=>{
        const r=await fetch('/api/auth/session',{credentials:'include'});
        if(!r.ok)throw new Error('Synthetic session failed');
        return (await r.json()).activeContext?.role;
      });
      assert.equal(role,'GUARDIAN','Exact guardian role is required');
      for(const width of SHARED_UX_WIDTHS){
        await page.setViewportSize({width,height:850});
        const response=await page.goto(ORIGIN+'/app',{waitUntil:'domcontentloaded'});
        assert(response?.ok(),'Family home navigation failed');
        const settled=await observeSettledPage(page);
        assert(!settled.error&&!settled.denied&&!settled.timedOut,'Family home failed to settle');
        await page.getByTestId('family-home').waitFor({state:'visible'});
        const dimensions=await page.evaluate(()=>({
          document:document.documentElement.scrollWidth,
          viewport:window.innerWidth,
          mains:document.querySelectorAll('main#main').length
        }));
        assert.equal(dimensions.mains,1,'One main landmark must exist');
        assert(dimensions.document<=dimensions.viewport+1,'Family home must not overflow horizontally');
        const announcement=page.getByTestId('family-active-child-announcement');
        assert.equal(await announcement.getAttribute('role'),'status');
        assert.equal(await announcement.getAttribute('aria-live'),'polite');
        assert.equal(await announcement.getAttribute('aria-atomic'),'true');
        const tabs=page.locator('[data-testid^="family-switch-"]');
        const count=await tabs.count();
        let siblingControls='NOT_APPLICABLE_IN_SEED';
        if(count>=2){
          const second=tabs.nth(1);
          await second.focus();
          await page.keyboard.press('Enter');
          assert.equal(await second.getAttribute('aria-pressed'),'true');
          assert.equal(await second.getAttribute('aria-controls'),'family-active-child-detail');
          assert(await page.locator('#family-active-child-detail').count()===1);
          siblingControls='OBSERVED';
        }
        const skip=page.getByTestId('skip-to-main');
        await skip.focus();await page.keyboard.press('Enter');
        const keyboardSkip=await page.evaluate(()=>
          location.hash==='#main'&&document.getElementById('main')!==null);
        assert(keyboardSkip,'Keyboard skip-to-main must work at every viewport');
        await setTheme(page,'light');
        const light=await contrastAndDigest(page);
        await setTheme(page,'dark');
        const dark=await contrastAndDigest(page);
        // On first navigation of the next width, React/hydration reuses dark
        // preference; every width explicitly tests both actual shell modes.
        observations.push({persona:'guardian',width,route:'/app',
          status:'ROUTE_RENDERED',overflow:'NONE',keyboardSkip:'PASS',
          siblingLiveRegion:'PRESENT',siblingControls,
          contrastLight:light.contrast,contrastDark:dark.contrast,
          lightSha256:light.sha256,darkSha256:dark.sha256});
      }
    }finally{await context.close();}
    const receipt={schemaVersion:1,environment:'ISOLATED_SYNTHETIC_CI',
      evidenceType:'AUTOMATED_BROWSER_NOT_HUMAN_ACCESSIBILITY',
      governance:{clinicalGate:'NO_GO_G2_G2b',screenReaderAcceptance:'NOT_RUN',
        humanUsability:'NOT_RUN',ownerSignoff:'NOT_OBTAINED',
        realTaskTiming:'NOT_RUN',visualApproval:'NOT_OBTAINED'},
      summary:{observations:observations.length,failed:0,screenshotsArchived:0},
      observations};
    validateSharedGuardianReceipt(receipt);
    await writeFile(output,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
    console.log('M5 guardian shared UX synthetic technical evidence:',JSON.stringify(receipt.summary));
    return receipt;
  }finally{await browser.close();}
}
