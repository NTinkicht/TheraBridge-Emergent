export declare const ILLUSTRATION_STYLE_VERSION: 'm5-b-v1';
export declare const ILLUSTRATION_STYLE_STATE: 'CANDIDATE_NOT_APPROVED';
export declare const ILLUSTRATION_SCENE_ARCHETYPES: readonly [
  'therapist-guided','independent-practice','home-support','materials-sequence','safety-access'
];
export declare const ILLUSTRATION_FAMILIES: readonly ['speech','occupational','behavioral','physical','group'];
export declare const ILLUSTRATION_ARTBOARD: Readonly<{
  width: 1600; height: 1200;
  safeSquare: Readonly<{x:200;y:0;width:1200;height:1200}>;
}>;
export declare const ILLUSTRATION_REFERENCE_SLOTS: readonly Readonly<{
  id:string;scene:string;family:string;conceptOnly:true;approved:false;
  imageUrl:null;publishEnabled:false;
}>[];
