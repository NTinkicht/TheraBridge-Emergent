import {
  ConflictException, ForbiddenException, GoneException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import type { Center, Invitation, InvitationKind, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthState } from '../auth/access';
import { ContextService } from '../auth/context.service';
import { hashPassword, passwordPolicyError } from '../auth/password';
import { RateLimitStore } from '../auth/rate-limit.store';
import { ClientMeta, SessionService } from '../auth/session.service';
import { CLOCK, Clock } from '../common/clock';
import { normalizeEmail, randomToken, sha256 } from '../common/security';
import { AUTH_CONFIG, AuthConfig } from '../config/env';
import { DevMailboxService } from '../dev-mailbox/dev-mailbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { TRIAL_ENDED, TrialService, trialExpired } from '../operations/trial.service';
import { Tx, clean, completeSetupStep, invitationView, logCenterEvent, uniq, withUniqueGuard } from './history';

export const INVITE_TTL_MS = 7 * 24 * 3_600_000;
const MAX_SENDS = 5;
const PUBLIC_LIMIT = 30;
const PUBLIC_WINDOW_MS = 15 * 60_000;
const DUPLICATE = 'A pending invitation already exists for this email. Resend or revoke it instead.';
const FIRST_ADMIN_DUPLICATE = 'This center already has a pending administrator invitation. Resend, revoke or replace it.';
const UNUSABLE = 'This invitation has already been used, was revoked or has expired. Ask for a new invitation.';
const ROLE_NAMES: Record<string, string> = { CENTER_ADMIN: 'center administrator', COORDINATOR: 'coordinator', THERAPIST: 'therapist', CLINICAL_SUPERVISOR: 'clinical supervisor' };

export interface InviteInput {
  centerId: string;
  kind: InvitationKind;
  email: string;
  displayName: string;
  roles: Role[];
  specialties?: string[];
  responsibilities?: string[];
  title?: string;
  invitedById: string;
  guardianLinkId?: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: RateLimitStore,
    private readonly audit: AuditService,
    private readonly mailbox: DevMailboxService,
    private readonly sessions: SessionService,
    private readonly contexts: ContextService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthConfig,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly trial: TrialService,
  ) {}

  // Restricted delivery: local dev mailbox / server-side outbox only. The raw token is never logged or returned by the API.
  deliver(inv: Invitation, centerName: string, token: string): void {
    const roles = inv.roles.map((r) => ROLE_NAMES[r] ?? r).join(' and ');
    this.mailbox.send({
      to: inv.email,
      subject: inv.kind === 'FIRST_ADMIN' ? `Set up ${centerName} on TheraBridge` : `Join ${centerName} on TheraBridge`,
      body: `Hello ${inv.displayName},\n\nYou have been invited to ${centerName} as ${roles}.\nAccept within 7 days: ${this.cfg.corsOrigins[0]}/invite#token=${token}\n\nIf you were not expecting this invitation, you can ignore this message.`,
    });
  }

  async createInTx(tx: Tx, input: InviteInput, now: Date): Promise<{ invitation: Invitation; token: string }> {
    const emailNorm = normalizeEmail(input.email);
    const existing = await tx.membership.findFirst({ where: { centerId: input.centerId, user: { emailNormalized: emailNorm } } });
    if (existing?.status === 'ACTIVE' && input.kind !== 'GUARDIAN') throw new ConflictException('This person is already a member of this center. Change their roles from their profile instead.');
    if (existing?.status === 'SUSPENDED') throw new ConflictException('This person’s access is suspended. Reactivate them from their profile instead.');
    const token = randomToken();
    const invitation = await tx.invitation.create({
      data: {
        centerId: input.centerId, kind: input.kind, email: input.email.trim(), emailNorm, displayName: clean(input.displayName),
        roles: uniq(input.roles), specialties: uniq(input.specialties), responsibilities: uniq(input.responsibilities), title: input.title?.trim() || null,
        tokenHash: sha256(token), expiresAt: new Date(now.getTime() + INVITE_TTL_MS), lastSentAt: now, invitedById: input.invitedById, createdAt: now, guardianLinkId: input.guardianLinkId ?? null,
      },
    });
    await logCenterEvent(tx, input.centerId, 'invitation.created', now, {
      actorUserId: input.invitedById, invitationId: invitation.id, meta: { kind: input.kind, roles: invitation.roles, invitee: invitation.displayName },
    });
    return { invitation, token };
  }

  private async createAndSend(input: InviteInput, onTx?: (tx: Tx, now: Date) => Promise<unknown>, before?: (tx: Tx, now: Date) => Promise<unknown>) {
    const now = this.clock.now();
    const { invitation, token, center } = await withUniqueGuard(
      () => this.prisma.$transaction(async (tx) => {
        await before?.(tx, now);
        const center = await tx.center.findUnique({ where: { id: input.centerId } });
        if (!center) throw new NotFoundException('Center not found');
        const r = await this.createInTx(tx, input, now);
        await onTx?.(tx, now);
        return { ...r, center };
      }),
      input.kind === 'FIRST_ADMIN' ? FIRST_ADMIN_DUPLICATE : DUPLICATE,
    );
    this.deliver(invitation, center.name, token);
    await this.audit.record('invitation.created', { actorUserId: input.invitedById, meta: { centerId: input.centerId, invitationId: invitation.id, kind: input.kind } });
    return invitationView(invitation, now);
  }

  inviteStaff(centerId: string, actorUserId: string, dto: { email: string; displayName: string; roles: string[]; title?: string; specialties?: string[]; responsibilities?: string[] }) {
    return this.createAndSend(
      { centerId, kind: 'STAFF', invitedById: actorUserId, email: dto.email, displayName: dto.displayName, roles: dto.roles as Role[], title: dto.title, specialties: dto.specialties, responsibilities: dto.responsibilities },
      (tx, now) => completeSetupStep(tx, centerId, 'invite_team', actorUserId, now),
      (tx, now) => (dto.roles.includes('THERAPIST') ? this.trial.assertTherapistSeat(tx, centerId, now) : this.trial.assertWritable(tx, centerId, now)),
    );
  }

  inviteFirstAdmin(centerId: string, actorUserId: string, dto: { email: string; displayName: string }) {
    return this.createAndSend({ centerId, kind: 'FIRST_ADMIN', invitedById: actorUserId, email: dto.email, displayName: dto.displayName, roles: ['CENTER_ADMIN'] });
  }

  async list(centerId: string, kind?: InvitationKind) {
    const now = this.clock.now();
    const rows = await this.prisma.invitation.findMany({ where: { centerId, ...(kind ? { kind } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 200 });
    return { items: rows.map((r) => invitationView(r, now)) };
  }

  private async pending(centerId: string, id: string, kind: InvitationKind) {
    const inv = await this.prisma.invitation.findFirst({ where: { id, centerId, kind }, include: { center: true } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== 'PENDING') throw new ConflictException('Only pending invitations can be changed.');
    return inv;
  }

  async resend(centerId: string, id: string, actorUserId: string, kind: InvitationKind) {
    const inv = await this.pending(centerId, id, kind);
    if (inv.sendCount >= MAX_SENDS) throw new HttpException('This invitation was sent too many times. Revoke it and create a new one.', HttpStatus.TOO_MANY_REQUESTS);
    const now = this.clock.now();
    const token = randomToken();
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.invitation.updateMany({
        where: { id, status: 'PENDING', sendCount: inv.sendCount },
        data: { tokenHash: sha256(token), expiresAt: new Date(now.getTime() + INVITE_TTL_MS), sendCount: { increment: 1 }, lastSentAt: now },
      });
      if (r.count !== 1) throw new ConflictException('This invitation changed. Reload to see the latest status.');
      await logCenterEvent(tx, centerId, 'invitation.resent', now, { actorUserId, invitationId: id, meta: { sendCount: inv.sendCount + 1 } });
      return tx.invitation.findUniqueOrThrow({ where: { id } });
    });
    this.deliver(updated, inv.center.name, token);
    await this.audit.record('invitation.resent', { actorUserId, meta: { centerId, invitationId: id } });
    return invitationView(updated, now);
  }

  async revoke(centerId: string, id: string, actorUserId: string, kind: InvitationKind) {
    await this.pending(centerId, id, kind);
    const now = this.clock.now();
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.invitation.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REVOKED', revokedAt: now, revokedById: actorUserId } });
      if (r.count !== 1) throw new ConflictException('This invitation changed. Reload to see the latest status.');
      await logCenterEvent(tx, centerId, 'invitation.revoked', now, { actorUserId, invitationId: id });
      return tx.invitation.findUniqueOrThrow({ where: { id } });
    });
    await this.audit.record('invitation.revoked', { actorUserId, meta: { centerId, invitationId: id } });
    return invitationView(updated, now);
  }

  async replaceFirstAdmin(centerId: string, id: string, actorUserId: string, dto: { email: string; displayName: string }) {
    const old = await this.pending(centerId, id, 'FIRST_ADMIN');
    const now = this.clock.now();
    const { invitation, token } = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const r = await tx.invitation.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REPLACED', revokedAt: now, revokedById: actorUserId } });
      if (r.count !== 1) throw new ConflictException('This invitation changed. Reload to see the latest status.');
      const created = await this.createInTx(tx, { centerId, kind: 'FIRST_ADMIN', email: dto.email, displayName: dto.displayName, roles: ['CENTER_ADMIN'], invitedById: actorUserId }, now);
      await tx.invitation.update({ where: { id }, data: { replacedById: created.invitation.id } });
      await logCenterEvent(tx, centerId, 'invitation.replaced', now, { actorUserId, invitationId: id, meta: { replacementId: created.invitation.id } });
      return created;
    }), FIRST_ADMIN_DUPLICATE);
    this.deliver(invitation, old.center.name, token);
    await this.audit.record('invitation.replaced', { actorUserId, meta: { centerId, invitationId: id, replacementId: invitation.id } });
    return invitationView(invitation, now);
  }

  // ---- Public acceptance ----

  private async throttle(ip: string) {
    const now = this.clock.now();
    const key = `invite:${ip}`;
    if ((await this.limits.count(key, PUBLIC_WINDOW_MS, now)) >= PUBLIC_LIMIT) {
      throw new HttpException('Too many attempts from this network. Please wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.limits.hit(key, PUBLIC_WINDOW_MS, now);
  }

  private find(token: string) {
    return this.prisma.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { center: true } });
  }

  private async usable(token: string, now: Date): Promise<Invitation & { center: Center }> {
    const inv = await this.find(token);
    if (!inv) throw new NotFoundException('This invitation link is not valid. Ask for a new invitation.');
    if (inv.status !== 'PENDING' || inv.expiresAt <= now || inv.center.status !== 'ACTIVE') throw new GoneException(UNUSABLE);
    if (trialExpired(inv.center, now)) throw new GoneException(TRIAL_ENDED);
    return inv;
  }

  async inspect(token: string, ip: string) {
    await this.throttle(ip);
    const now = this.clock.now();
    const inv = await this.find(token);
    if (!inv) throw new NotFoundException('This invitation link is not valid. Ask for a new invitation.');
    const status = invitationView(inv, now).status;
    if (status !== 'PENDING' || inv.center.status !== 'ACTIVE') return { status: status === 'PENDING' ? 'UNAVAILABLE' : status };
    const accountExists = !!(await this.prisma.user.findUnique({ where: { emailNormalized: inv.emailNorm } }));
    return { status, kind: inv.kind, centerName: inv.center.name, email: inv.email, displayName: inv.displayName, roles: inv.roles, title: inv.title, expiresAt: inv.expiresAt, accountExists };
  }

  private async claimAndJoin(tx: Tx, inv: Invitation, userId: string, now: Date): Promise<string> {
    const claimed = await tx.invitation.updateMany({ where: { id: inv.id, status: 'PENDING', expiresAt: { gt: now } }, data: { status: 'ACCEPTED', acceptedAt: now, acceptedUserId: userId } });
    if (claimed.count !== 1) throw new GoneException(UNUSABLE);
    const profile = { title: inv.title, specialties: inv.specialties, responsibilities: inv.responsibilities };
    const m = await tx.membership.findUnique({ where: { userId_centerId: { userId, centerId: inv.centerId } }, include: { roles: true } });
    let membershipId: string;
    if (!m) {
      membershipId = (await tx.membership.create({ data: { userId, centerId: inv.centerId, ...profile, roles: { create: inv.roles.map((role) => ({ role })) } } })).id;
    } else if (m.status === 'SUSPENDED') {
      throw new ConflictException('Your access to this center is suspended. Contact the center administrator.');
    } else {
      const revoked = m.status === 'REVOKED';
      if (revoked) await tx.roleAssignment.deleteMany({ where: { membershipId: m.id } });
      const have = revoked ? [] : m.roles.map((r) => r.role);
      await tx.roleAssignment.createMany({ data: inv.roles.filter((r) => !have.includes(r)).map((role) => ({ membershipId: m.id, role })) });
      await tx.membership.update({ where: { id: m.id }, data: revoked ? { status: 'ACTIVE', statusReason: null, statusChangedAt: now, ...profile } : {} });
      membershipId = m.id;
    }
    if (inv.guardianLinkId) {
      const linked = await tx.guardianLink.updateMany({ where: { id: inv.guardianLinkId, removedAt: null }, data: { userId } });
      if (linked.count !== 1) throw new GoneException(UNUSABLE);
    }
    await logCenterEvent(tx, inv.centerId, 'invitation.accepted', now, { actorUserId: userId, subjectUserId: userId, membershipId, invitationId: inv.id, meta: { kind: inv.kind, roles: inv.roles } });
    return membershipId;
  }

  async acceptNew(dto: { token: string; displayName: string; password: string }, meta: ClientMeta): Promise<string> {
    await this.throttle(meta.ip);
    const now = this.clock.now();
    const inv = await this.usable(dto.token, now);
    const EXISTS = 'An account already exists for this email. Sign in to accept the invitation.';
    if (await this.prisma.user.findUnique({ where: { emailNormalized: inv.emailNorm } })) throw new ConflictException(EXISTS);
    const policy = passwordPolicyError(dto.password, inv.email);
    if (policy) throw new UnprocessableEntityException(policy);
    const passwordHash = await hashPassword(dto.password);
    const { userId, membershipId } = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: inv.email, emailNormalized: inv.emailNorm, displayName: clean(dto.displayName), identities: { create: { provider: 'local', subject: inv.emailNorm, passwordHash, passwordChangedAt: now } } },
      });
      return { userId: user.id, membershipId: await this.claimAndJoin(tx, inv, user.id, now) };
    }), EXISTS);
    const token = await this.sessions.create(userId, meta);
    await this.contexts.enterMembership(token, membershipId);
    await this.audit.record('invitation.accepted', { actorUserId: userId, ip: meta.ip, meta: { centerId: inv.centerId, invitationId: inv.id, newAccount: true } });
    return token;
  }

  async acceptExisting(auth: AuthState, token: string, meta: ClientMeta): Promise<string> {
    await this.throttle(meta.ip);
    const now = this.clock.now();
    const inv = await this.usable(token, now);
    if (auth.session.user.emailNormalized !== inv.emailNorm) {
      throw new ForbiddenException('This invitation was sent to a different email address. Sign out and sign in with the invited account.');
    }
    const membershipId = await this.prisma.$transaction((tx) => this.claimAndJoin(tx, inv, auth.session.userId, now));
    const next = await this.sessions.rotate(auth.session, 'invitation_accepted', await this.contexts.membershipFields(auth.session.userId, membershipId));
    await this.audit.record('invitation.accepted', { actorUserId: auth.session.userId, ip: meta.ip, meta: { centerId: inv.centerId, invitationId: inv.id, newAccount: false } });
    return next;
  }
}
