import 'dotenv/config';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { randomToken } from '../common/security';

// Entirely fictional, isolated demonstration. No claims about real therapy outcomes.
// Do not reuse this data, credentials, or consent in clinical settings.
const SCOPE = 'therabridge-childrens-home-ahmed-synthetic-v1';
export const DEMO_SLUG = 'childrens-home-demo';
export const DEMO_EMAILS = {
  platform: 'platform.demo@childrens-home.therabridge.test',
  admin: 'admin@childrens-home.therabridge.test',
  coordinator: 'coordinator@childrens-home.therabridge.test',
  speech: 'speech@childrens-home.therabridge.test',
  ot: 'ot@childrens-home.therabridge.test',
  supervisor: 'supervisor@childrens-home.therabridge.test',
  parent: 'mariam.ahmed@childrens-home.therabridge.test',
} as const;
export const DEMO_CREDS = resolve(__dirname, '../../../../.workspace/local-credentials/childrens-home-demo.json');

function id(name: string): string {
  const s = createHash('sha256').update(SCOPE + ':' + name).digest('hex');
  return [s.slice(0, 8), s.slice(8, 12), '4' + s.slice(13, 16), '8' + s.slice(17, 20), s.slice(20, 32)].join('-');
}
export function assertDemoAllowed(env: Record<string, string | undefined>): void {
  if (!['ci', 'local', 'preview', 'shared-synthetic'].includes(env.DEPLOYMENT_ENV ?? '')) throw new Error('Demo seeding requires an explicitly synthetic deployment environment.');
  if (env.DEMO_SEED_CONFIRM !== 'CHILDRENS_HOME_SYNTHETIC_ONLY') throw new Error('Set DEMO_SEED_CONFIRM=CHILDRENS_HOME_SYNTHETIC_ONLY explicitly.');
  const url = new URL(env.DATABASE_URL ?? '');
  const dbName = decodeURIComponent(url.pathname.slice(1));
  if (!/(demo|preview|synthetic|_test)/i.test(dbName)) throw new Error('Refusing to seed a database whose name is not explicitly demo/preview/synthetic/test.');
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') throw new Error('PostgreSQL is required.');
}

const roster: { key: keyof typeof DEMO_EMAILS; name: string; role: Role | null; specialties: string[]; title: string }[] = [
  { key: 'platform', name: 'Platform Demo Operator (synthetic)', role: null, specialties: [], title: 'Platform operator' },
  { key: 'admin', name: 'Salma Rahman', role: 'CENTER_ADMIN', specialties: [], title: 'Centre administrator' },
  { key: 'coordinator', name: 'Dina Saeed', role: 'COORDINATOR', specialties: [], title: 'Care coordinator' },
  { key: 'speech', name: 'Layla Faris', role: 'THERAPIST', specialties: ['speech'], title: 'Speech and language therapist' },
  { key: 'ot', name: 'Omar Nasser', role: 'THERAPIST', specialties: ['occupational'], title: 'Occupational therapist' },
  { key: 'supervisor', name: 'Dr. Hana Saleh', role: 'CLINICAL_SUPERVISOR', specialties: [], title: 'Clinical supervisor' },
  { key: 'parent', name: 'Mariam Ahmed', role: 'GUARDIAN', specialties: [], title: 'Parent' },
];

const DAY = 86400000;
function localDate(offset: number, now: Date): string {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(now);
  const get = (key: string) => parts.find(x => x.type === key)!.value;
  const base = Date.parse(get('year') + '-' + get('month') + '-' + get('day') + 'T00:00:00Z');
  return new Date(base + offset * DAY).toISOString().slice(0, 10);
}
function at(date: string, hourUTC: number): Date {
  return new Date(date + 'T' + String(hourUTC).padStart(2, '0') + ':00:00Z');
}

export async function seedChildrensHome(db: PrismaClient, credentialFile = DEMO_CREDS) {
  assertDemoAllowed(process.env);
  const now = new Date();
  const cid = id('center');
  const existingSlug = await db.center.findUnique({ where: { slug: DEMO_SLUG } });
  if (existingSlug && existingSlug.id !== cid) throw new Error('Demo slug already belongs to another centre; refusing to overwrite it.');
  const preexistingUsers: string[] = [];
  for (const a of roster) {
    const email = DEMO_EMAILS[a.key];
    const user = await db.user.findUnique({ where: { emailNormalized: email } });
    if (user && user.id !== id('user:' + a.key)) throw new Error('Email collision: ' + email);
    if (user) {
      if (user.status !== 'ACTIVE') throw new Error('Existing demo account is disabled: ' + email);
      preexistingUsers.push(email);
    }
  }
  // A seed rerun never rotates a password, and won't strand existing accounts.
  if (preexistingUsers.length && !existsSync(credentialFile)) {
    throw new Error('Demo accounts exist but secure credential file is missing. Restore it or use an explicitly disposable fresh demo database.');
  }
  if (!preexistingUsers.length && existsSync(credentialFile)) {
    throw new Error('Credential file belongs to a different database. Refusing to overwrite; use a clean protected credential location.');
  }
  if (existsSync(credentialFile)) {
    const stored = JSON.parse(readFileSync(credentialFile, 'utf8')) as { accounts?: { email: string }[] };
    if (roster.some(a => !stored.accounts?.some(x => x.email === DEMO_EMAILS[a.key]))) throw new Error('Stored demo credentials are incomplete; refusing silent rotation.');
  }
  if (await db.center.findUnique({ where: { id: cid } })) {
    const c = await db.center.findUniqueOrThrow({ where: { id: cid } });
    if (c.slug !== DEMO_SLUG || c.name !== "Children's Home Centre") throw new Error('Demo centre ID collision.');
  }

  const center = await db.center.upsert({
    where: { id: cid },
    create: {
      id: cid, name: "Children's Home Centre", slug: DEMO_SLUG, timezone: 'Asia/Dubai',
      country: 'United Arab Emirates', city: 'Sharjah', specialties: ['speech', 'occupational'],
      source: 'DIRECT', trialEndsAt: new Date(now.getTime() + 30 * DAY),
    },
    update: {},
  });
  const credentials: { email: string; password: string; role: string }[] = [];
  const users: Record<string, string> = {}, members: Record<string, string> = {};
  for (const a of roster) {
    const email = DEMO_EMAILS[a.key];
    const uid = id('user:' + a.key);
    const existing = await db.user.findUnique({ where: { id: uid } });
    const user = existing ?? await db.user.create({ data: { id: uid, email, emailNormalized: email, displayName: a.name } });
    users[a.key] = user.id;
    const identity = await db.authIdentity.findUnique({ where: { userId_provider: { userId: user.id, provider: 'local' } } });
    if (!identity) {
      const password = 'tb-' + randomToken(20);
      await db.authIdentity.create({ data: { userId: user.id, provider: 'local', subject: email, passwordHash: await hashPassword(password) } });
      credentials.push({ email, password, role: a.role ?? 'PLATFORM_ADMIN' });
    }
    if (a.key === 'platform') {
      if (!await db.platformRoleAssignment.count({ where: { userId: user.id, role: 'PLATFORM_ADMIN', revokedAt: null } })) {
        await db.platformRoleAssignment.create({ data: { userId: user.id, source: 'synthetic_seed', reason: 'Synthetic demonstration only' } });
      }
      continue;
    }
    const mid = id('member:' + a.key);
    const membership = await db.membership.upsert({
      where: { id: mid },
      create: { id: mid, userId: user.id, centerId: center.id, status: 'ACTIVE', title: a.title, specialties: a.specialties, responsibilities: [] },
      update: {},
    });
    if (membership.centerId !== cid || membership.userId !== uid || membership.status !== 'ACTIVE') throw new Error('Demo membership changed unexpectedly.');
    members[a.key] = membership.id;
    await db.roleAssignment.upsert({
      where: { membershipId_role: { membershipId: membership.id, role: a.role! } },
      create: { membershipId: membership.id, role: a.role! },
      update: {},
    });
  }

  const childId = id('child:yusuf');
  const child = await db.child.upsert({
    where: { id: childId },
    create: {
      id: childId, centerId: center.id, firstName: 'Yusuf', lastName: 'Ahmed', preferredName: 'Yusuf',
      dateOfBirth: new Date('2020-05-14T00:00:00Z'), services: ['speech', 'occupational'],
      createdById: users.admin, createdAt: now,
    },
    update: {},
  });
  if (child.centerId !== center.id || child.firstName !== 'Yusuf' || child.lastName !== 'Ahmed') throw new Error('Child identity collision.');
  const guardian = await db.guardianLink.upsert({
    where: { id: id('guardian:mariam') },
    create: {
      id: id('guardian:mariam'), centerId: center.id, childId: child.id, userId: users.parent,
      email: DEMO_EMAILS.parent, emailNorm: DEMO_EMAILS.parent,
      displayName: 'Mariam Ahmed', relationship: 'mother', isPrimary: true, createdAt: now,
    },
    update: {},
  });
  if (guardian.childId !== childId || guardian.userId !== users.parent || guardian.removedAt) throw new Error('Guardian link not active or does not belong to demo family.');
  for (const [key, service] of [['speech', 'speech'], ['ot', 'occupational']] as const) {
    const assignment = await db.careAssignment.upsert({
      where: { id: id('assignment:' + service) },
      create: {
        id: id('assignment:' + service), centerId: cid, childId, membershipId: members[key],
        service, isLead: key === 'speech', startedAt: new Date(now.getTime() - 35 * DAY),
      },
      update: {},
    });
    if (assignment.endedAt || assignment.membershipId !== members[key] || assignment.childId !== childId) throw new Error('Demo assignment is missing or revoked.');
  }

  const activityDefinitions = [
    { key: 'speech-turns', title: 'Ahmed Demo - Picture Turn Taking', service: 'speech', minutes: 12, steps: ['Show a picture and take turns describing it.', 'Record completed turns.'] },
    { key: 'speech-phrases', title: 'Ahmed Demo - Two Word Phrases', service: 'speech', minutes: 10, steps: ['Model two-word phrases with toy objects.', 'Invite the child to try during play.'] },
    { key: 'ot-grip', title: 'Ahmed Demo - Pegboard Grip', service: 'occupational', minutes: 12, steps: ['Offer a stable pegboard and large pegs.', 'Record independent placements.'] },
    { key: 'ot-sequence', title: 'Ahmed Demo - Dressing Sequence', service: 'occupational', minutes: 10, steps: ['Arrange picture cards of dressing steps.', 'Invite the child to order the cards.'] },
  ];
  const templates: Record<string, { id: string; version: number; title: string; service: string; ageBand: string; minutes: number; materials: string[]; steps: string[]; safety: string[]; centerId: string | null }> = {};
  for (const a of activityDefinitions) {
    const template = await db.activityTemplate.upsert({
      where: { id: id('template:' + a.key) },
      create: {
        id: id('template:' + a.key), centerId: cid, title: a.title, service: a.service,
        ageBand: '5-7', minutes: a.minutes, materials: ['Fictional demo materials'], steps: a.steps,
        safety: ['Adult supervision; synthetic example only.'], createdById: users[a.service === 'speech' ? 'speech' : 'ot'], createdAt: now,
      },
      update: {},
    });
    if (template.centerId !== cid || template.service !== a.service) throw new Error('Activity template collision.');
    templates[a.key] = template;
  }
  // Family practice currently renders only the global synthetic sample library.
  // These two are explicitly labeled synthetic and globally visible as samples.
  for (const key of ['speech-turns', 'ot-grip'] as const) {
    const source = templates[key];
    await db.activityTemplate.upsert({
      where: { id: id('family-sample:' + key) },
      create: {
        id: id('family-sample:' + key), centerId: null,
        title: source.title + ' (sample only)', service: source.service,
        ageBand: source.ageBand, minutes: source.minutes, materials: source.materials,
        steps: source.steps, safety: source.safety, createdAt: now,
      },
      update: {},
    });
  }

  const planGoals: Record<string, { key: string; title: string; measure: string; baseline: number; target: number }[]> = {
    speech: [
      { key: 'turn-taking', title: 'Take turns in a supported picture game', measure: 'count', baseline: 1, target: 6 },
      { key: 'short-phrases', title: 'Use short phrases during familiar play', measure: 'count', baseline: 2, target: 8 },
    ],
    occupational: [
      { key: 'pegboard', title: 'Place pegs independently during table activity', measure: 'count', baseline: 1, target: 7 },
      { key: 'sequence', title: 'Order basic dressing sequence cards', measure: 'count', baseline: 1, target: 5 },
    ],
  };
  const plans: Record<string, string> = {};
  for (const service of ['speech', 'occupational'] as const) {
    const key = service === 'speech' ? 'speech' : 'ot';
    const assessmentDate = localDate(-35, now);
    const assessment = await db.assessment.upsert({
      where: { id: id('assessment:' + service) },
      create: {
        id: id('assessment:' + service), centerId: cid, childId,
        membershipId: members[key], service, assessedOn: new Date(assessmentDate + 'T00:00:00Z'),
        summary: 'Fictional baseline: engaging play participation with graded adult assistance. Not a real assessment.',
        areas: [{ area: service === 'speech' ? 'Functional communication' : 'Fine-motor participation', finding: 'Invented baseline for demo purposes; no clinical validity claimed.' }],
        status: 'DRAFT', createdAt: now, updatedAt: now,
      },
      update: {},
    });
    if (assessment.childId !== childId || assessment.service !== service) throw new Error('Assessment collision.');
    const plan = await db.therapyPlan.upsert({
      where: { id: id('plan:' + service) },
      create: { id: id('plan:' + service), centerId: cid, childId, service, title: 'Yusuf Ahmed - ' + (service === 'speech' ? 'Speech' : 'OT') + ' synthetic draft plan', createdById: users[key], createdAt: now },
      update: {},
    });
    if (plan.childId !== childId || plan.service !== service) throw new Error('Plan collision.');
    const home = service === 'speech' ? templates['speech-turns'] : templates['ot-grip'];
    const version = await db.planVersion.upsert({
      where: { id: id('plan-version:' + service) },
      create: {
        id: id('plan-version:' + service), planId: plan.id, centerId: cid, number: 1,
        status: 'DRAFT', summary: 'Fictional training objectives only. No approval or family release.',
        goals: planGoals[service],
        homeActivities: [{ templateId: home.id, frequency: 'Twice weekly (demo proposal)', note: 'Not released to family; sample plan only.' }],
        authorId: users[key], createdAt: now, updatedAt: now,
      },
      update: {},
    });
    if (version.planId !== plan.id || version.status !== 'DRAFT') throw new Error('Draft version is no longer available; cannot reseed.');
    plans[service] = version.id;
  }

  // Eight historical fictional visits with one unsigned, completed execution record
  // per appointment, plus two upcoming appointments. No signing or release.
  for (const service of ['speech', 'occupational'] as const) {
    const key = service === 'speech' ? 'speech' : 'ot';
    const template = service === 'speech' ? templates['speech-turns'] : templates['ot-grip'];
    const goal = planGoals[service][0];
    const hour = service === 'speech' ? 5 : 6; // 09:00 / 10:00 Asia/Dubai
    for (let index = 0; index < 5; index++) {
      const offset = index < 4 ? [-28, -21, -14, -7][index] : (service === 'speech' ? 3 : 6);
      const date = localDate(offset, now);
      const startsAt = at(date, hour), endsAt = new Date(startsAt.getTime() + 45 * 60000);
      const appointmentId = id('appointment:' + service + ':' + index);
      const appt = await db.appointment.upsert({
        where: { id: appointmentId },
        create: {
          id: appointmentId, centerId: cid, childId, membershipId: members[key],
          service, startsAt, endsAt, room: service === 'speech' ? 'Speech room' : 'OT studio',
          status: index < 4 ? 'COMPLETED' : 'SCHEDULED', createdById: users.coordinator, createdAt: now,
        },
        update: {},
      });
      if (appt.centerId !== cid || appt.childId !== childId || appt.service !== service) throw new Error('Appointment collision.');
      if (index === 4) continue;
      const noteId = id('session:' + service + ':' + index);
      const outcome = index < 2 ? 'PARTIAL' : 'ACHIEVED';
      const assistance = index < 2 ? 'SOME_ASSISTANCE' : 'INDEPENDENT';
      const activity = {
        id: id('session-activity:' + service + ':' + index),
        templateId: template.id,
        snapshot: {
          id: template.id, title: template.title, version: template.version, service: template.service,
          ageBand: template.ageBand, minutes: template.minutes, materials: template.materials,
          steps: template.steps, safety: template.safety, source: 'CENTER_LIBRARY',
        },
        planVersionId: plans[service], goalKey: goal.key, goalSnapshot: goal,
        minutes: 12, objective: goal.title, completion: 'COMPLETED', outcome, assistance,
        observation: 'Invented example: structured play completed with ' + assistance.toLowerCase().replace('_', ' ') + '.',
        authorId: users[key], createdAt: endsAt.toISOString(), updatedAt: endsAt.toISOString(),
        position: 0, evidenceKind: 'UNVALIDATED_SESSION_ACTIVITY',
      };
      const n = await db.sessionNote.upsert({
        where: { id: noteId },
        create: {
          id: noteId, centerId: cid, childId, membershipId: members[key], appointmentId,
          service, sessionDate: new Date(date + 'T00:00:00Z'),
          sections: {
            focus: 'Invented ' + service + ' learning scenario.',
            activities: template.title,
            response: 'Fictional observations recorded for product demonstration, not clinical interpretation.',
            nextSteps: 'Continue the draft exercise sequence (synthetic).',
          },
          activities: [activity], executionStatus: 'COMPLETED', attendance: 'PRESENT',
          actualStart: startsAt, actualEnd: endsAt, status: 'DRAFT',
          createdAt: endsAt, updatedAt: endsAt,
        },
        update: {},
      });
      if (n.childId !== childId || n.appointmentId !== appointmentId || n.executionStatus !== 'COMPLETED') throw new Error('Historical session was changed; immutable evidence must not be overwritten.');
      // Two measurements per goal, intentionally non-linear and clearly invented.
      for (let g = 0; g < 2; g++) {
        const goalRow = planGoals[service][g];
        const observed = await db.observation.upsert({
          where: { id: id('observation:' + service + ':' + index + ':' + g) },
          create: {
            id: id('observation:' + service + ':' + index + ':' + g),
            centerId: cid, childId, planVersionId: plans[service], goalKey: goalRow.key,
            membershipId: members[key], sessionNoteId: noteId, observedOn: new Date(date + 'T00:00:00Z'),
            value: (g === 0 ? [2, 3, 3, 4][index] : [2, 2, 3, 4][index]),
            note: 'Synthetic session measurement only; no clinical significance.',
            createdAt: endsAt,
          },
          update: {},
        });
        if (observed.childId !== childId || observed.planVersionId !== plans[service]) throw new Error('Observation scope collision.');
      }
    }
    await db.progressReport.upsert({
      where: { id: id('report:' + service) },
      create: {
        id: id('report:' + service), centerId: cid, childId, membershipId: members[key],
        service, title: 'Yusuf Ahmed - fictional ' + service + ' progress draft',
        periodStart: new Date(localDate(-35, now) + 'T00:00:00Z'), periodEnd: new Date(localDate(-1, now) + 'T00:00:00Z'),
        status: 'DRAFT', sections: {
          summary: 'SYNTHETIC / UNSIGNED — sample clinician draft.',
          goals: 'Review the recorded sample measurements; no automatic interpretation.',
          recommendations: 'None authorized for family release.',
        }, createdAt: now, updatedAt: now,
      },
      update: {},
    });
  }

  if (!preexistingUsers.length) {
    if (credentials.length !== roster.length) throw new Error('Partial demo identities detected; secure credential export not safe.');
    mkdirSync(dirname(credentialFile), { recursive: true, mode: 0o700 });
    writeFileSync(credentialFile, JSON.stringify({ synthetic: true, center: DEMO_SLUG, createdAt: now.toISOString(), accounts: credentials }, null, 2), { flag: 'wx', mode: 0o600 });
    chmodSync(credentialFile, 0o600);
  }
  return { center: center.slug, family: 'Ahmed', child: 'Yusuf Ahmed', accounts: roster.length, appointments: 10, historicalSessions: 8, observations: 16, assessments: 2, plans: 2, reportDrafts: 2, credentials: credentialFile };
}

if (require.main === module) {
  const db = new PrismaClient();
  seedChildrensHome(db)
    .then(result => console.log(JSON.stringify({ ...result, credentials: 'PROTECTED FILE — see docs/demo/DEMO_GUIDE.md' }, null, 2)))
    .catch(error => { console.error('Demo seed refused or failed:', (error as Error).message); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
