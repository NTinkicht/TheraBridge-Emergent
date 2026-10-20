// Design-preview fixtures. Every person, center and record here is fictional and is NOT read from the API.
export type SpecialtyKey = 'speech' | 'ot' | 'physio' | 'aba' | 'group';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const longDate = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
export const weekdayShort = (d: Date) => WEEKDAYS[d.getDay()].slice(0, 3);
export const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
export function ago(min: number): string {
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

/* ---------- Platform ---------- */
export type CenterStatus = 'active' | 'trial' | 'restricted';
export interface CenterFx { id: string; name: string; city: string; status: CenterStatus; plan: string; daysUsed: number; therapists: number; pending: number; children: number }
export const centers: CenterFx[] = [
  { id: 'harbor', name: 'Harbor Child Development Center', city: 'Portsmouth', status: 'active', plan: 'Subscribed', daysUsed: 30, therapists: 6, pending: 0, children: 14 },
  { id: 'cedar', name: 'Cedar Grove Kids Clinic', city: 'York', status: 'trial', plan: 'Trial', daysUsed: 27, therapists: 2, pending: 1, children: 1 },
  { id: 'willow', name: 'Willow Creek Therapy', city: 'Bath', status: 'trial', plan: 'Trial', daysUsed: 6, therapists: 1, pending: 0, children: 0 },
  { id: 'brightpath', name: 'Brightpath Therapy Studio', city: 'Exeter', status: 'restricted', plan: 'Trial expired', daysUsed: 30, therapists: 3, pending: 0, children: 1 },
];

export interface ApplicationFx { id: string; ref: string; name: string; city: string; specialties: SpecialtyKey[]; contact: string; email: string; staff: string; submittedMin: number; status: 'pending' | 'approved' | 'rejected' }
export const applications: ApplicationFx[] = [
  { id: 'app-1', ref: 'APP-2041', name: 'Northwind Pediatric Therapy', city: 'Leeds', specialties: ['speech', 'ot', 'aba'], contact: 'Priya Nair', email: 'priya.nair@northwind.example', staff: '6–10', submittedMin: 2950, status: 'pending' },
  { id: 'app-2', ref: 'APP-2044', name: 'Little Steps Therapy Hub', city: 'Manchester', specialties: ['physio', 'ot'], contact: 'Daniel Brooks', email: 'daniel.brooks@littlesteps.example', staff: '1–5', submittedMin: 300, status: 'pending' },
  { id: 'app-3', ref: 'APP-2032', name: 'Sunrise Speech Studio', city: 'Bristol', specialties: ['speech'], contact: 'Ines Duarte', email: 'ines@sunrise.example', staff: '1–5', submittedMin: 7300, status: 'rejected' },
  { id: 'app-4', ref: 'APP-2027', name: 'Willow Creek Therapy', city: 'Bath', specialties: ['speech', 'physio'], contact: 'Grace Lin', email: 'grace.lin@willow.example', staff: '1–5', submittedMin: 8700, status: 'approved' },
];

export type EventType = 'application' | 'center' | 'access';
export const events: { id: string; type: EventType; action: string; subject: string; actor: string; min: number }[] = [
  { id: 'e1', type: 'application', action: 'Application received', subject: 'Little Steps Therapy Hub', actor: 'Public form', min: 300 },
  { id: 'e2', type: 'center', action: 'Trial-ending reminder queued', subject: 'Cedar Grove Kids Clinic', actor: 'System', min: 640 },
  { id: 'e3', type: 'access', action: 'Therapist invitation sent', subject: 'Cedar Grove Kids Clinic', actor: 'Maya Chen', min: 1500 },
  { id: 'e4', type: 'application', action: 'Application received', subject: 'Northwind Pediatric Therapy', actor: 'Public form', min: 2950 },
  { id: 'e5', type: 'center', action: 'Center restricted: trial expired', subject: 'Brightpath Therapy Studio', actor: 'System', min: 5800 },
  { id: 'e6', type: 'application', action: 'Application rejected', subject: 'Sunrise Speech Studio', actor: 'Nadia Ortiz', min: 7200 },
  { id: 'e7', type: 'center', action: 'Center provisioned, trial started', subject: 'Willow Creek Therapy', actor: 'Nadia Ortiz', min: 8640 },
];

/* ---------- Center (Cedar Grove, on trial) ---------- */
export type StaffStatus = 'active' | 'pending' | 'expired';
export const staff: { name: string; email: string; specialties: SpecialtyKey[]; status: StaffStatus; detail: string }[] = [
  { name: 'Ravi Menon', email: 'ravi.menon@cedargrove.example', specialties: ['speech', 'ot'], status: 'active', detail: 'Joined 24 days ago' },
  { name: 'Elena Petrova', email: 'elena.petrova@cedargrove.example', specialties: ['physio'], status: 'active', detail: 'Joined 20 days ago' },
  { name: 'Hana Sato', email: 'hana.sato@cedargrove.example', specialties: ['aba'], status: 'pending', detail: 'Invitation expires in 5 days' },
  { name: 'Tom Becker', email: 'tom.becker@cedargrove.example', specialties: ['ot'], status: 'expired', detail: 'Expired 2 days ago · not counted' },
];
export const centerSessions: { id: string; day: string; time: string; child: string; therapist: string; specialty: SpecialtyKey; room: string }[] = [
  { id: 's1', day: 'Today', time: '10:30', child: 'Ella Novak', therapist: 'Ravi Menon', specialty: 'speech', room: 'Room 1' },
  { id: 's2', day: 'Today', time: '14:00', child: 'Ella Novak', therapist: 'Elena Petrova', specialty: 'physio', room: 'Movement room' },
  { id: 's3', day: 'Tomorrow', time: '09:30', child: 'Ella Novak', therapist: 'Ravi Menon', specialty: 'ot', room: 'Room 1' },
];

/* ---------- Therapist (Leila Hassan at Harbor, Speech + OT) ---------- */
export type ApptStatus = 'completed' | 'next' | 'scheduled' | 'cancelled';
export interface AppointmentFx { id: string; start: string; end: string; child: string; specialty: 'speech' | 'ot'; focus: string; room: string; status: ApptStatus; note?: string }
export const appointments: AppointmentFx[] = [
  { id: 'a1', start: '08:30', end: '09:15', child: 'Alex Morgan', specialty: 'speech', focus: 'Following two-step directions', room: 'Room 2', status: 'completed' },
  { id: 'a2', start: '09:30', end: '10:15', child: 'Noah Patel', specialty: 'ot', focus: 'Pencil grasp and tracing', room: 'Sensory room', status: 'completed' },
  { id: 'a3', start: '10:30', end: '11:15', child: 'Mila Santos', specialty: 'speech', focus: 'Sound practice: /s/ blends', room: 'Room 2', status: 'next' },
  { id: 'a4', start: '13:00', end: '13:45', child: 'Alex Morgan', specialty: 'ot', focus: 'Two-handed coordination games', room: 'Sensory room', status: 'scheduled' },
  { id: 'a5', start: '14:00', end: '14:45', child: 'Yara Haddad', specialty: 'speech', focus: 'Turn-taking in conversation', room: 'Room 2', status: 'scheduled' },
  { id: 'a6', start: '15:30', end: '16:15', child: 'Leo Kim', specialty: 'ot', focus: 'Self-care routine: buttons', room: 'Sensory room', status: 'cancelled', note: 'Cancelled by family request' },
];

/* ---------- Child (Alex Morgan) ---------- */
export const goals = [
  { id: 'g1', specialty: 'speech' as const, title: 'Follows two-step directions in play', observations: 4, last: 2, status: 'In progress' },
  { id: 'g2', specialty: 'speech' as const, title: 'Uses three-word phrases to request', observations: 3, last: 6, status: 'In progress' },
  { id: 'g3', specialty: 'ot' as const, title: 'Uses both hands together to open containers', observations: 2, last: 9, status: 'Not yet observed this month' },
];
export const observations = [
  { day: 23, value: 2 }, { day: 16, value: 3 }, { day: 9, value: 3 }, { day: 2, value: 4 },
];
export const childSessions = [
  { id: 'cs1', daysAgo: 0, specialty: 'speech' as const, therapist: 'Leila Hassan', status: 'Completed', note: 'Note not started' },
  { id: 'cs2', daysAgo: 7, specialty: 'ot' as const, therapist: 'Leila Hassan', status: 'Completed', note: 'Draft · version 2' },
  { id: 'cs3', daysAgo: 9, specialty: 'speech' as const, therapist: 'Leila Hassan', status: 'Completed', note: 'Draft · version 1' },
];

/* ---------- Family (Sara Morgan, guardian of Alex) ---------- */
export const weekPlan: ({ title: string; minutes: number } | null)[] = [
  { title: 'Bubble breaths', minutes: 10 },
  { title: 'Picture talk', minutes: 15 },
  { title: 'Sound hunt', minutes: 10 },
  { title: 'Story retell', minutes: 15 },
  { title: 'Bubble breaths', minutes: 10 },
  null,
  null,
];
export const pastOutcomes = ['done', 'done', 'needs-help', 'skipped', 'done'] as const;
export const activitySteps: Record<string, string[]> = {
  'Bubble breaths': [
    'Sit together somewhere calm and hold a bubble wand between you.',
    'Take a slow breath in together, then blow gently to make bubbles.',
    'Ask Alex to "pop three bubbles, then clap", a two-step direction.',
    'Take turns giving the directions. Stop whenever Alex wants a break.',
  ],
  'Picture talk': [
    'Choose a picture book with busy pages.',
    'Point to one picture and ask Alex to tell you what is happening.',
    'Repeat back what Alex said, adding one more word.',
    'Swap roles so Alex asks you about a picture.',
  ],
  'Sound hunt': [
    'Pick three toys whose names start with the same sound.',
    'Hide them around one room together.',
    'Say each name slowly when Alex finds it, then let Alex say it too.',
  ],
  'Story retell': [
    'Read a short story together.',
    'Ask Alex what happened first, next and last.',
    'Use the pictures as clues if Alex gets stuck.',
  ],
};
