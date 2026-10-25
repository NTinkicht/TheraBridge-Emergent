// No hosted target, credentials or patient data. Smoke-test the version-matched
// Playwright container and the real CSS viewport widths before hosted use.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {WIDTHS} from './hosted-readonly.mjs';

const browser=await chromium.launch();
try{
 for(const width of WIDTHS){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  try{
   const page=await context.newPage();
   await page.setContent('<main aria-label="Offline browser fixture">QA runtime</main>');
   const measured=await page.evaluate(()=>({width:innerWidth,height:innerHeight,device:devicePixelRatio}));
   assert.deepEqual(measured,{width,height:900,device:1});
  }finally{await context.close();}
 }
 console.log('PASS: preinstalled pinned Chromium at five exact CSS viewports; no external access');
}finally{await browser.close();}
