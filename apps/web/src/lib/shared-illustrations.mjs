import {DEMO_ILLUSTRATION_MAP} from './demo-illustration-map.mjs';
import {SHARED_ILLUSTRATIONS} from './shared-illustration-manifest.mjs';
export function sharedIllustration(id) {
  return SHARED_ILLUSTRATIONS.find(x=>x.id===id)??null;
}
export function sharedIllustrationUrl(asset) {
  return '/illustrations/m5-b-v1/'+asset.id+'/'+asset.digest+'.webp';
}
// Platform library samples have migration-generated UUIDs. Only a verified
// synthetic library context and exact content qualify for portable mapping.
const portableTitles=new Set(['Bubble breath and sounds','Snack-time choices','Playdough pinch and roll','Pillow path balance walk']);
export function sharedIllustrationForActivity(t,syntheticSample=false) {
  const mapped=DEMO_ILLUSTRATION_MAP.find(x=>(x.id===t.id||((t.library==='synthetic'||syntheticSample)&&portableTitles.has(x.title)))&&x.title===t.title&&x.service===t.service&&Array.isArray(t.steps)&&x.steps.length===t.steps.length&&x.steps.every((step,i)=>step===t.steps[i]));
  return mapped?sharedIllustration(mapped.ref):null;
}
