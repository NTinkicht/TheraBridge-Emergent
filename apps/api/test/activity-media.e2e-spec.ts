import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ActivityMediaService } from '../src/clinical/activity-media.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { TrialService } from '../src/operations/trial.service';
import type { Viewer } from '../src/operations/children.service';

const now = new Date('2026-11-18T00:00:00Z');
const userId = '00000000-0000-4000-8000-000000000001';
const centerId = '00000000-0000-4000-8000-000000000002';
const templateId = '00000000-0000-4000-8000-000000000003';
const draftId = '00000000-0000-4000-8000-000000000004';
const candidateId = '00000000-0000-4000-8000-000000000006';
const actor: Viewer = { userId, membershipId: '00000000-0000-4000-8000-000000000005', role: 'THERAPIST' };
const dto = {
  templateVersion: 3, sourceType: 'GENERATED' as const, styleVersion: 'm5-b-v1',
  sceneType: 'guided-activity', altText: 'A therapist guides a child through hand movements.',
  license: 'Commercial terms reviewed in proposal', sourceReference: 'provider-review-record-01',
  providerTerms: 'Commercial use terms verified by reviewer: not approved',
};

function setup(override: Record<string, unknown> = {}) {
  const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: draftId, ...data, version: 1 }));
  const updateMany = jest.fn(async () => ({ count: 1 }));
  const findFirst = jest.fn(async () => ({ id: templateId, centerId, createdById: userId, service: 'speech', version: 3, steps: ['Choose a card', 'Match the pictures'], ...override }));
  const tx = {
    $queryRaw: jest.fn(async () => [{ id: templateId }]),
    activityTemplate: { findFirst },
    membership: { findFirst: jest.fn(async () => ({ id: actor.membershipId })) },
    activityMediaDraft: { create, updateMany, findMany: jest.fn(async (_args?: unknown): Promise<{ id: string }[]> => []), findFirst: jest.fn(async () => ({ id: draftId })) },
    privateMediaCandidate: {
      updateMany: jest.fn(async () => ({ count: 2 })),
      findFirst: jest.fn(async () => ({ id: candidateId })),
      findMany: jest.fn(async (): Promise<unknown[]> => []),
    },
    centerEvent: { create: jest.fn(async () => ({})) },
  };
  const prisma = {
    $transaction: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) => work(tx)),
    activityTemplate: { findFirst }, activityMediaDraft: { findMany: jest.fn(async () => []) },
  };
  const trial = { now: () => now, assertWritable: jest.fn(async () => undefined) };
  const service = new ActivityMediaService(prisma as unknown as PrismaService, trial as unknown as TrialService);
  return { service, tx, prisma, trial, create, updateMany };
}

describe('M5-14 activity illustration draft boundary', () => {
  it('registers only tenant-scoped, non-published metadata and logs an audit event', async () => {
    const { service, tx, create } = setup();
    const result = await service.propose(centerId, actor, templateId, dto);
    expect(result.publishEnabled).toBe(false);
    expect(result.clinicalReleaseEnabled).toBe(false);
    expect(create.mock.calls[0][0].data).toEqual(expect.objectContaining({
      centerId, templateId, templateVersion: 3, state: 'DRAFT', createdById: userId,
    }));
    expect(tx.centerEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'media.draft_registered', centerId }),
    }));
  });

  it('accepts a step-specific draft only for a real step on the exact source version', async () => {
    const { service, create } = setup();
    await service.propose(centerId, actor, templateId, { ...dto, stepNumber: 2 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stepNumber: 2, templateVersion: 3 }),
    }));
  });

  it('refuses a missing, out-of-range or non-integer step without writing a draft', async () => {
    for (const stepNumber of [0, 3, 65, 1.5]) {
      const { service, create } = setup();
      await expect(service.propose(centerId, actor, templateId, {
        ...dto, stepNumber,
      })).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(create).not.toHaveBeenCalled();
    }
  });

  it('fails closed when source version changes', async () => {
    const { service, create } = setup({ version: 4 });
    await expect(service.propose(centerId, actor, templateId, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects foreign templates and unauthorized therapist authors', async () => {
    const absent = setup({ centerId: 'other' });
    absent.tx.activityTemplate.findFirst.mockResolvedValueOnce(null as never);
    await expect(absent.service.propose(centerId, actor, templateId, dto)).rejects.toBeInstanceOf(NotFoundException);
    const forbidden = setup({ createdById: 'other' });
    await expect(forbidden.service.propose(centerId, actor, templateId, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes media access when the therapist loses their specialty', async () => {
    const { service, tx, create } = setup();
    tx.membership.findFirst.mockResolvedValueOnce({ id: actor.membershipId }).mockResolvedValueOnce(null as never);
    await expect(service.propose(centerId, actor, templateId, dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('lets a currently active clinical supervisor manage centre-owned proposal metadata', async () => {
    const { service } = setup({ createdById: 'other' });
    const supervisor = { ...actor, role: 'CLINICAL_SUPERVISOR' as const };
    const result = await service.propose(centerId, supervisor, templateId, dto);
    expect(result.state).toBe('DRAFT');
  });

  it('requires generation-provider terms before storing a proposed AI asset', async () => {
    const { service, create } = setup();
    await expect(service.propose(centerId, actor, templateId, { ...dto, providerTerms: '' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects with optimistic version and never publishes on state transitions', async () => {
    const { service, tx, updateMany } = setup();
    const result = await service.reject(centerId, actor, templateId, draftId, { version: 1, reason: 'Inaccurate child hand position' });
    expect(result).toEqual({ id: draftId, state: 'REJECTED', version: 2, publishEnabled: false });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: draftId, centerId, templateId, version: 1, state: 'DRAFT' } }));
    expect(tx.centerEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'media.draft_rejected' }),
    }));
  });

  it('revokes only currently quarantined linked image candidates in the same scoped draft transaction', async () => {
    const { service, tx } = setup();
    await service.reject(centerId, actor, templateId, draftId,
      { version: 1, reason: 'Rejected unsafe pose after human draft review' });
    expect(tx.privateMediaCandidate.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.privateMediaCandidate.updateMany).toHaveBeenCalledWith({
      where: {
        centerId, templateId, mediaDraftId: draftId,
        kind: 'ACTIVITY_IMAGE', status: 'QUARANTINED', revokedAt: null,
      },
      data: { status: 'REVOKED', revokedAt: now },
    });
  });
  it('never revokes candidates when optimistic rejection fails, and never logs an audit on failure', async () => {
    const { service, tx, updateMany } = setup();
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.reject(centerId, actor, templateId, draftId,
      { version: 1, reason: 'Stale draft rejection revision' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.privateMediaCandidate.updateMany).not.toHaveBeenCalled();
    expect(tx.centerEvent.create).not.toHaveBeenCalled();
  });
  it('rejects the entire draft transition if quarantine revocation write fails', async () => {
    const { service, tx } = setup();
    tx.privateMediaCandidate.updateMany.mockRejectedValueOnce(new Error('Synthetic DB revocation failure'));
    await expect(service.reject(centerId, actor, templateId, draftId,
      { version: 1, reason: 'Unsafe rights evidence in draft' })).rejects.toThrow('Synthetic DB revocation failure');
    expect(tx.centerEvent.create).not.toHaveBeenCalled();
  });

  it('refuses stale or already rejected revisions', async () => {
    const { service, updateMany } = setup();
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.reject(centerId, actor, templateId, draftId, { version: 1, reason: 'Invalid reference licensing' })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('M5-14 keyset pagination: rights history is never truncated', () => {
  const ids = Array.from({ length: 102 }, (_, index) => '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'));
  it('returns a stable next cursor for older pending and rejected metadata', async () => {
    const { service, tx } = setup();
    const first = ids.slice(0, 51).map(id => ({ id }));
    const second = ids.slice(50, 102).map(id => ({ id }));
    tx.activityMediaDraft.findMany.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const page1 = await service.list(centerId, actor, templateId);
    expect(page1.items).toHaveLength(50);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe(ids[49]);
    expect(page1.publishEnabled).toBe(false);
    const page2 = await service.list(centerId, actor, templateId, page1.nextCursor!);
    expect(page2.items).toHaveLength(50);
    expect(page2.nextCursor).toBe(ids[99]);
    expect(tx.activityMediaDraft.findFirst).toHaveBeenCalledWith({
      where: { id: ids[49], centerId, templateId }, select: { id: true },
    });
    expect(tx.activityMediaDraft.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { centerId, templateId }, cursor: { id: ids[49] }, skip: 1, take: 51,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
  });
  it('returns a terminal page without a cursor when history is exhausted', async () => {
    const { service, tx } = setup();
    tx.activityMediaDraft.findMany.mockResolvedValueOnce([{ id: ids[100] }, { id: ids[101] }]);
    const result = await service.list(centerId, actor, templateId, ids[99]);
    expect(result).toEqual(expect.objectContaining({ hasMore: false, nextCursor: null, publishEnabled: false }));
    expect(result.items).toHaveLength(2);
  });
  it('refuses cross-tenant or deleted cursors rather than leaking history', async () => {
    const { service, tx } = setup();
    tx.activityMediaDraft.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.list(centerId, actor, templateId, ids[50])).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.activityMediaDraft.findMany).not.toHaveBeenCalled();
  });
  it('refuses unbounded page sizes on the server', async () => {
    const { service, tx } = setup();
    await expect(service.list(centerId, actor, templateId, undefined, 101)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(service.list(centerId, actor, templateId, undefined, -1)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.activityMediaDraft.findMany).not.toHaveBeenCalled();
  });
});

describe('M5-14 private candidate status history (no bytes or read authority)', () => {
  it('lists bounded status-only metadata with tenant/draft scoping', async () => {
    const { service, tx } = setup();
    const item = { id: candidateId, status: 'QUARANTINED', width: 1600, height: 1200,
      templateVersion: 3, createdAt: now, revokedAt: null };
    tx.privateMediaCandidate.findMany.mockResolvedValueOnce([item] as never);
    const result = await service.candidateStatuses(centerId, actor, templateId, draftId);
    expect(result).toEqual(expect.objectContaining({
      items: [item], hasMore: false, metadataOnly: true, readEnabled: false,
      publishEnabled: false, clinicalReleaseEnabled: false,
    }));
    expect(tx.privateMediaCandidate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { centerId, templateId, mediaDraftId: draftId, kind: 'ACTIVITY_IMAGE' },
      select: {
        id: true, status: true, width: true, height: true, createdAt: true,
        templateVersion: true, revokedAt: true,
      },
    }));
    expect(JSON.stringify(result)).not.toMatch(/encryptedBytes|digestSha256|scannerName|publicUrl|objectKey/);
  });
  it('rejects a foreign draft or foreign cursor before querying candidates', async () => {
    const missing = setup();
    missing.tx.activityMediaDraft.findFirst.mockResolvedValueOnce(null as never);
    await expect(missing.service.candidateStatuses(centerId, actor, templateId, draftId))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(missing.tx.privateMediaCandidate.findMany).not.toHaveBeenCalled();
    const foreign = setup();
    foreign.tx.privateMediaCandidate.findFirst.mockResolvedValueOnce(null as never);
    await expect(foreign.service.candidateStatuses(centerId, actor, templateId, draftId, candidateId))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(foreign.tx.privateMediaCandidate.findMany).not.toHaveBeenCalled();
  });
  it('paginates historical states without truncation or unbounded pages', async () => {
    const { service, tx } = setup();
    const items = Array.from({length: 51}, (_,i)=>({
      id: '00000000-0000-4000-8000-' + String(i+100).padStart(12,'0'),
      status: 'REVOKED', templateVersion: 2,
    }));
    tx.privateMediaCandidate.findMany.mockResolvedValueOnce(items as never);
    const page = await service.candidateStatuses(centerId, actor, templateId, draftId);
    expect(page.hasMore).toBe(true);
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBe(items[49].id);
    await expect(service.candidateStatuses(centerId, actor, templateId, draftId, undefined, 101))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
