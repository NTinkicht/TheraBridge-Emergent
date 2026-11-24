import { rest } from './auth';

const root = (centerId: string) => `/api/centers/${centerId}/family-releases`;
export type FamilyDocument = { id: string; kind: 'PLAN' | 'REPORT'; status: string; replaced: boolean; childId: string; childName: string;
  rendering: Record<string, unknown>; renderingHash: string; synthetic: true };
export const familyReleaseApi = {
  artwork: (centerId:string,id:string,index:number,slot:number) =>
    rest.get<{activityIndex:number;slot:number;altText:string;width:number;height:number;pngBase64:string;synthetic:true}>(
      '/api/centers/'+encodeURIComponent(centerId)+'/family-releases/mine/'+encodeURIComponent(id)+'/artwork/'+index+'/'+slot),
  artworkCoverage: (centerId:string,id:string) =>
    rest.get<{scope:'AUTHORIZED_SYNTHETIC_PLAN';total:number;covered:number;percent:number|null;synthetic:true}>(
      '/api/centers/'+encodeURIComponent(centerId)+'/family-releases/mine/'+encodeURIComponent(id)+'/artwork-coverage'),
  mine: (c: string) => rest.get<{ synthetic: true; items: { id: string; kind: string; status: string; childId: string; childName: string }[] }>(`${root(c)}/mine`),
  read: (c: string, id: string) => rest.get<FamilyDocument>(`${root(c)}/mine/${id}`),
  consent: (c: string, childId: string, purpose: 'FAMILY_PLAN' | 'FAMILY_REPORT', withdraw = false) =>
    rest.send('POST', `${root(c)}/consents${withdraw ? '/withdraw' : ''}`, { childId, purpose }),
  approve: (c: string, snapshotId: string) => rest.send<{ id: string; renderingHash: string; synthetic: true; signed: false }>(
    'POST', `${root(c)}/approvals`, { snapshotId }),
  recipients: (c: string, approvalId: string) => rest.get<{ items: { id: string; displayName: string; eligible: boolean }[] }>(
    `${root(c)}/approvals/${approvalId}/recipients`),
  recoverGrants: (c: string) => rest.get<{ items: {
    id: string; approvalId: string; guardianLinkId: string; status: string;
    childId: string; childName: string; guardianName: string }[] }>(`${root(c)}/grants/recover`),
  grantsForApproval: (c: string, approvalId: string) => rest.get<{ items: { id: string; guardianLinkId: string; status: string }[] }>(
    `${root(c)}/approvals/${approvalId}/grants`),
  grant: (c: string, approvalId: string, guardianLinkId: string) => rest.send('POST', `${root(c)}/grants`,
    { approvalId, guardianLinkId }),
  change: (c: string, id: string, status: 'REVOKED' | 'WITHDRAWN' | 'SUPERSEDED', reason: string) =>
    rest.send('POST', `${root(c)}/grants/${id}/change`, { status, reason }),
};
