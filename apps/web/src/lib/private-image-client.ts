export const MAX_PRIVATE_IMAGE_BYTES_CLIENT = 512 * 1024;
export type QuarantinedImage = {
  id:string; status:'QUARANTINED'; width:number;height:number;
  publishEnabled?:false;readEnabled?:false;consentState?:'PENDING';
};
