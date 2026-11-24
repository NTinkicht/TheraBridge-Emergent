import {DEMO_ILLUSTRATION_MAP} from './demo-illustration-map.mjs';
import {SHARED_ILLUSTRATIONS} from './shared-illustration-manifest.mjs';
export function sharedIllustration(id) {
  return SHARED_ILLUSTRATIONS.find(x=>x.id===id)??null;
}
export function sharedIllustrationUrl(asset) {
  return '/illustrations/m5-b-v1/'+asset.id+'/'+asset.digest+'.webp';
}
// Exact known synthetic activity content only. No title substring matching,
// no automatic treatment association, no read of patient media.
export function sharedIllustrationForActivity(t) {
  const mapped=DEMO_ILLUSTRATION_MAP.find(x=>x.id===t.id&&x.title===t.title&&x.service===t.service&&Array.isArray(t.steps)&&x.steps.length===t.steps.length&&x.steps.every((step,i)=>step===t.steps[i]));
  if(mapped)return sharedIllustration(mapped.ref);
  if(t.service!=='occupational'||!['Ahmed Demo - Pegboard Grip','Ahmed Demo - Pegboard Grip (sample only)'].includes(t.title)||
     !Array.isArray(t.steps)||t.steps.length!==2||
     t.steps[0]!=='Offer a stable pegboard and large pegs.'||t.steps[1]!=='Record independent placements.')return null;
  return sharedIllustration('WU2A-S1-OCCUPATIONAL');
}
