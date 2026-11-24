import type {SharedIllustration} from './shared-illustration-manifest.mjs';
export declare function sharedIllustration(id:unknown): SharedIllustration|null;
export declare function sharedIllustrationUrl(asset:SharedIllustration):string;
export declare function sharedIllustrationForActivity(t:{title:string;service:string;steps:readonly string[]}):SharedIllustration|null;
