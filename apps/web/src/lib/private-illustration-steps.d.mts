/** TS contract for the private-only JS projection imported by React. */
export declare const PRIVATE_STEP_IMAGE_STATE:
  'UNAVAILABLE_PENDING_INDEPENDENT_ASSET_APPROVAL';
export declare const PRIVATE_STEP_PREVIEW_PUBLICATION_ENABLED: false;
export type PrivateStepPlaceholder = Readonly<{
  state: typeof PRIVATE_STEP_IMAGE_STATE;
  aspectRatio: '4:3';
  safeSquare: Readonly<{x:200;y:0;width:1200;height:1200}>;
  altText: null;
  imageUrl: null;
  approved: false;
  publishEnabled: false;
  guardianReadEnabled: false;
  clinicalReleaseEnabled: false;
}>;
export type PrivateStepPreview = Readonly<{
  styleVersion: 'm5-b-v1';
  templateVersion: number;
  stepCount: number;
  state: 'STAFF_ONLY_UNRELEASED_STEP_PREVIEW';
  displayMedia: false;
  approved: false;
  publishEnabled: false;
  guardianReadEnabled: false;
  clinicalReleaseEnabled: false;
  steps: readonly Readonly<{
    number: number;
    instruction: string;
    styleVersion: 'm5-b-v1';
    templateVersion: number;
    placeholder: PrivateStepPlaceholder;
  }>[];
}>;
export declare function projectPrivateIllustrationSteps(input: {
  templateVersion?: number;
  steps: readonly string[];
}): PrivateStepPreview | null;
