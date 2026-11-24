import { rest } from './auth';
export type ActivityMediaSource = 'ORIGINAL' | 'GENERATED' | 'LICENSED';
export type ActivityMediaDraft = {
  id: string; templateId: string; centerId: string; templateVersion: number;
  state: 'DRAFT' | 'REJECTED'; version: number; sourceType: ActivityMediaSource;
  stepNumber: number | null;
  styleVersion: string; sceneType: string; altText: string; license: string;
  sourceReference: string; rejectionReason: string | null;
};
export type PrivateActivityCandidateStatus = {
  id: string; status: string; width: number; height: number;
  templateVersion: number | null; createdAt: string; revokedAt: string | null;
};
export type ActivityMediaMapping = {
  templateVersion: number;
  slots: { stepNumber: number | null; proposed: number; staged: number }[];
  metadataOnly: true; readEnabled: false; publishEnabled: false; clinicalReleaseEnabled: false;
};
export type StaffArtworkInventory = {
  templateVersion:number;
  items:{stepNumber:number|null;altText:string;width:number;height:number}[];
  coverage:{wholeActivityVerified:boolean;verifiedSteps:number;expectedSteps:number;stepCoveragePercent:number|null;
    publishedCoveragePercent:null;publishedCoverageAvailable:false};
  metadataOnly:true;readEnabled:false;publishEnabled:false;clinicalReleaseEnabled:false;
};
export type StaffArtworkPreview = {
  templateVersion:number; stepNumber:number|null; altText:string; width:number; height:number; pngBase64:string;
  staffPreview:true; publishEnabled:false; clinicalReleaseEnabled:false;
};
export const activityMediaDrafts = {
  endpoint: (centerId: string, templateId: string) =>
    `/api/centers/${encodeURIComponent(centerId)}/activities/${encodeURIComponent(templateId)}/media-drafts`,
  approvedArtwork: (centerId:string,templateId:string) =>
    rest.get<StaffArtworkInventory>(activityMediaDrafts.endpoint(centerId,templateId) + '/approved-artwork'),
  readApprovedArtwork: (centerId:string, templateId:string, version:number, slot:number) =>
    rest.get<StaffArtworkPreview>(activityMediaDrafts.endpoint(centerId,templateId) + '/approved-artwork/' + version + '/' + slot),
  mapping: (centerId: string, templateId: string) =>
    rest.get<ActivityMediaMapping>(activityMediaDrafts.endpoint(centerId, templateId) + '/mapping'),
  list: (centerId: string, templateId: string, cursor?: string, limit = 50) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    return rest.get<{
      items: ActivityMediaDraft[]; hasMore: boolean; nextCursor: string | null;
      publishEnabled: false; clinicalReleaseEnabled: false;
    }>(activityMediaDrafts.endpoint(centerId, templateId) + '?' + query.toString());
  },
  propose: (centerId: string, templateId: string, body: {
    templateVersion: number; stepNumber?: number; sourceType: ActivityMediaSource; styleVersion: string;
    sceneType: string; altText: string; license: string; sourceReference: string; providerTerms?: string;
  }) => rest.send<ActivityMediaDraft>('POST', activityMediaDrafts.endpoint(centerId, templateId), body),
  candidates: (centerId:string,templateId:string,draftId:string,cursor?:string,limit=50) => {
    const query=new URLSearchParams({limit:String(limit)});
    if(cursor)query.set('cursor',cursor);
    return rest.get<{
      items:PrivateActivityCandidateStatus[];hasMore:boolean;nextCursor:string|null;
      metadataOnly:true;readEnabled:false;publishEnabled:false;clinicalReleaseEnabled:false;
    }>(activityMediaDrafts.endpoint(centerId,templateId)+'/'+encodeURIComponent(draftId)+'/candidates?'+query);
  },
  uploadCandidate: (centerId:string,templateId:string,draftId:string,pngBase64:string) =>
    rest.send<{id:string;status:'QUARANTINED';publishEnabled:false;readEnabled:false}>(
      'POST',activityMediaDrafts.endpoint(centerId,templateId)+'/'+encodeURIComponent(draftId)+'/candidates',{pngBase64}),
  revokeCandidate: (centerId:string,templateId:string,draftId:string,candidateId:string) =>
    rest.send<{id:string;status:'REVOKED';readEnabled:false;publishEnabled:false;clinicalReleaseEnabled:false}>(
      'POST',activityMediaDrafts.endpoint(centerId,templateId)+'/'+encodeURIComponent(draftId)+
        '/candidates/'+encodeURIComponent(candidateId)+'/revoke',{}),
  reject: (centerId: string, templateId: string, id: string, version: number, reason: string) =>
    rest.send<{ id: string; state: 'REJECTED'; version: number }>('POST',
      activityMediaDrafts.endpoint(centerId, templateId) + '/' + encodeURIComponent(id) + '/reject', { version, reason }),
};
