export type GeneratedArtwork=Readonly<{referenceId:string;reviewSha256:string;reviewByteLength:number;alt:string;scene:string;family:string;reviewFile:string;styleVersion:'m5-b-v1';sourceType:'GENERATED';status:'OWNER_REPORTED_STYLE_ACCEPTANCE_ASSET_REVIEW_PENDING';approved:false;publishEnabled:false;clinicalReleaseEnabled:false}>;
export declare const GENERATED_ARTWORK: readonly GeneratedArtwork[];
export declare function findGeneratedArtwork(id:unknown): GeneratedArtwork|null;
export declare function verifyGeneratedReviewBytes(id:unknown,bytes:Uint8Array):Promise<boolean>;
