/**
 * M5 WU2-E — private, presentation-only numbered illustration placeholders.
 * Callers MUST already be authorized for the specific center/activity.
 * This code grants NO access, image URL, clinical guidance or publication.
 */
import {ILLUSTRATION_STYLE_VERSION,ILLUSTRATION_ARTBOARD} from './illustration-style.mjs';

export const PRIVATE_STEP_IMAGE_STATE='UNAVAILABLE_PENDING_INDEPENDENT_ASSET_APPROVAL';
export const PRIVATE_STEP_PREVIEW_PUBLICATION_ENABLED=false;

const own=(object,key)=>{
  if(!object||typeof object!=='object')throw new TypeError('Invalid private step preview');
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))
    throw new TypeError('Invalid private step preview');
  return descriptor.value;
};

/**
 * Separate the exact clinician-written step string from future media slots.
 * A draft or quarantined candidate is never treated as an approved image.
 * No patient data, provider run, storage key, source digest or byte locator.
 */
export function projectPrivateIllustrationSteps(input){
  try{
    if(!input||typeof input!=='object'||Array.isArray(input)||
       Object.getPrototypeOf(input)!==Object.prototype) return null;
    const version=own(input,'templateVersion');
    const steps=own(input,'steps');
    if(!Number.isSafeInteger(version)||version<1||version>2147483647||
       !Array.isArray(steps)||Object.getPrototypeOf(steps)!==Array.prototype||
       steps.length>64) return null;
    const projected=[];
    for(let i=0;i<steps.length;i++){
      const instruction=own(steps,String(i));
      if(typeof instruction!=='string'||instruction.length>400||
         !instruction.trim())return null;
      projected.push(Object.freeze({
        number:i+1,instruction,
        styleVersion:ILLUSTRATION_STYLE_VERSION,
        templateVersion:version,
        placeholder: Object.freeze({
          state:PRIVATE_STEP_IMAGE_STATE,
          aspectRatio:'4:3',
          safeSquare:Object.freeze({...ILLUSTRATION_ARTBOARD.safeSquare}),
          altText:null,imageUrl:null,
          approved:false,publishEnabled:false,
          guardianReadEnabled:false,clinicalReleaseEnabled:false,
        }),
      }));
    }
    return Object.freeze({
      styleVersion:ILLUSTRATION_STYLE_VERSION,
      templateVersion:version,stepCount:projected.length,
      state:'STAFF_ONLY_UNRELEASED_STEP_PREVIEW',
      displayMedia:false,approved:false,publishEnabled:false,
      guardianReadEnabled:false,clinicalReleaseEnabled:false,
      steps:Object.freeze(projected),
    });
  }catch{return null;}
}
