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
export const activityMediaDrafts = {
  endpoint: (centerId: string, templateId: string) =>
    `/api/centers/${encodeURIComponent(centerId)}/activities/${encodeURIComponent(templateId)}/media-drafts`,
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
