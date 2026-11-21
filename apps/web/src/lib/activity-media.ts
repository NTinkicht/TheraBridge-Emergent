import { rest } from './auth';
export type ActivityMediaSource = 'ORIGINAL' | 'GENERATED' | 'LICENSED';
export type ActivityMediaDraft = {
  id: string; templateId: string; centerId: string; templateVersion: number;
  state: 'DRAFT' | 'REJECTED'; version: number; sourceType: ActivityMediaSource;
  styleVersion: string; sceneType: string; altText: string; license: string;
  sourceReference: string; rejectionReason: string | null;
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
    templateVersion: number; sourceType: ActivityMediaSource; styleVersion: string;
    sceneType: string; altText: string; license: string; sourceReference: string; providerTerms?: string;
  }) => rest.send<ActivityMediaDraft>('POST', activityMediaDrafts.endpoint(centerId, templateId), body),
  reject: (centerId: string, templateId: string, id: string, version: number, reason: string) =>
    rest.send<{ id: string; state: 'REJECTED'; version: number }>('POST',
      activityMediaDrafts.endpoint(centerId, templateId) + '/' + encodeURIComponent(id) + '/reject', { version, reason }),
};
