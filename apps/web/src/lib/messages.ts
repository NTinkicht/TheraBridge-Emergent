import { rest } from './auth';

export const CATEGORIES = [
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'other', label: 'Other' },
];
export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

export type ThreadAudience = 'GUARDIAN' | 'CARE_TEAM' | 'SPECIALTY';
export const AUDIENCES: { value: ThreadAudience; label: string }[] = [
  { value: 'GUARDIAN', label: 'A specific guardian' },
  { value: 'CARE_TEAM', label: 'Shared care team' },
  { value: 'SPECIALTY', label: 'Specialty team only' },
];
export const audienceLabel = (v: ThreadAudience) => AUDIENCES.find((a) => a.value === v)?.label ?? v;

export interface ThreadRow {
  id: string; childId: string; child: string; audience: ThreadAudience; service: string | null; subject: string; category: string; status: 'OPEN' | 'CLOSED';
  lastMessageAt: string; preview: string; lastFrom: 'FAMILY' | 'STAFF' | null; unread: boolean;
}
export interface ThreadDetail {
  id: string; childId: string; child: string; subject: string; category: string; status: 'OPEN' | 'CLOSED'; createdAt: string; closedAt: string | null; canManage: boolean;
  messages: { id: string; body: string; authorKind: 'FAMILY' | 'STAFF'; author: string; mine: boolean; createdAt: string }[];
}

const c = (centerId: string, path: string) => `/api/centers/${centerId}/${path}`;

export const messagesApi = {
  list: (centerId: string, status?: string) => rest.get<{ items: ThreadRow[]; unread: number }>(`${c(centerId, 'threads')}${status ? `?status=${status}` : ''}`),
  open: (centerId: string, body: { childId: string; category: string; subject: string; body: string; guardianLinkId?: string; audience?: ThreadAudience; service?: string }) => rest.send<{ id: string }>('POST', c(centerId, 'threads'), body),
  thread: (centerId: string, id: string) => rest.get<ThreadDetail>(c(centerId, `threads/${id}`)),
  reply: (centerId: string, id: string, body: string) => rest.send<ThreadDetail>('POST', c(centerId, `threads/${id}/messages`), { body }),
  setStatus: (centerId: string, id: string, close: boolean) => rest.send<ThreadDetail>('POST', c(centerId, `threads/${id}/${close ? 'close' : 'reopen'}`)),
};

export const NON_CLINICAL_NOTICE = 'Messages are for scheduling, attendance and everyday logistics only. Please don’t share health, therapy or progress details here. For anything urgent, call the center.';
