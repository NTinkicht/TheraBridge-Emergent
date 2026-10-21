import { rest } from './auth';
export type DocumentItem = { kind: 'PLAN'|'REPORT'; id: string; title: string; authorName: string; childId: string; childName: string; status: string; version: number; mine: boolean };
export type HistoryItem = { id: string; fromStatus: string; toStatus: string; reason: string; actorId: string; actorName: string; snapshotId: string; createdAt: string; sourceVersion: number };
export type Snapshot = { id: string; kind: string; documentId: string; sourceVersion: number; centerId: string; childId: string; authorId: string; generatedById: string; createdAt: string; fingerprint: string; content: Record<string, unknown>; evidence: Record<string, unknown>; notice: string };
export type AccessReview = {
  children: { id: string; firstName: string; lastName: string; guardians: { id: string; displayName: string; relationship: string; removedAt: string|null; userId: string|null; capabilities: string[]; restrictions: string; releaseReadiness: string }[] }[];
  invitations: { id: string; displayName: string; status: string; expiresAt: string }[];
  policies: { id: string; purpose: string; number: number; status: string; restrictions: unknown }[];
  records: { id: string; childId: string; guardianLinkId: string; policyId: string; status: string; authorizes: false; restrictions: unknown; effectiveAt: string|null; expiresAt: string|null; revokedAt: string|null; previousId: string|null }[];
  events: { id: string; type: string; createdAt: string; actorUserId: string|null }[];
  transfers: { id: string; childId: string; reason: string; status: string }[];
  staff: { id: string; user: { displayName: string } }[];
  assignments: { childId: string; membershipId: string; service: string }[];
  blockers: string[];
};
const root = (c: string) => `/api/centers/${c}/governance`;
export const governanceApi = {
  documents: (c: string) => rest.get<{items: DocumentItem[]}>(`${root(c)}/documents`),
  history: (c: string,d: DocumentItem) => rest.get<{items: HistoryItem[]}>(`${root(c)}/documents/${d.kind}/${d.id}/history`),
  transition: (c: string,d: DocumentItem,action: string,reason: string) => rest.send('POST',`${root(c)}/documents/${d.kind}/${d.id}/transitions`,{version:d.version,action,reason}),
  preview: (c: string,id: string) => rest.get<Snapshot>(`${root(c)}/previews/${id}`),
  access: (c: string) => rest.get<AccessReview>(`${root(c)}/access`),
  transfer: (c: string,body: {childId:string; fromMembershipId:string; toMembershipId:string; service:string; reason:string}) => rest.send('POST',`${root(c)}/transfer-simulations`,body),
};
