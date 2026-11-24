import { ActivityMediaService } from '../src/clinical/activity-media.service';
import { ILLUSTRATION_STYLE_VERSION } from '../src/clinical/illustration-style';
import { ForbiddenException } from '@nestjs/common';

describe('current private artwork mapping', () => {
  const centerId = 'center', templateId = 'template';
  const viewer = { userId: 'author', membershipId: 'member', role: 'THERAPIST' };
  function setup() {
    const groupBy = jest.fn().mockResolvedValueOnce([
      { stepNumber: null, _count: { _all: 2 } }, { stepNumber: 2, _count: { _all: 1 } },
    ]).mockResolvedValueOnce([{ stepNumber: null, _count: { _all: 1 } }]);
    const tx = { $queryRaw: jest.fn(), activityMediaDraft: { groupBy } };
    const prisma = { $transaction: jest.fn(async fn => fn(tx)) };
    const service = new ActivityMediaService(prisma as never, {} as never);
    const auth = jest.spyOn(service as any, 'authorizedTemplate').mockResolvedValue({
      version: 7, service: 'speech', steps: ['first', 'second', ' ', 'fourth'],
    });
    return { service, tx, groupBy, auth, prisma };
  }
  it('groups bounded current-version slots without disclosing candidate identity or bytes', async () => {
    const { service, groupBy, prisma, auth } = setup();
    const result = await service.mapping(centerId, viewer as never, templateId);
    expect(auth).toHaveBeenCalledWith(expect.anything(), centerId, viewer, templateId);
    expect(result).toEqual({ templateVersion: 7, slots: [
      { stepNumber: null, proposed: 2, staged: 1 },
      { stepNumber: 1, proposed: 0, staged: 0 },
      { stepNumber: 2, proposed: 1, staged: 0 },
      { stepNumber: 4, proposed: 0, staged: 0 },
    ], metadataOnly: true, readEnabled: false, publishEnabled: false, clinicalReleaseEnabled: false });
    const where = { centerId, templateId, templateVersion: 7, service: 'speech',
      state: 'DRAFT', styleVersion: ILLUSTRATION_STYLE_VERSION,
      OR: [{ stepNumber: null }, { stepNumber: { in: [1, 2, 4] } }] };
    expect(groupBy).toHaveBeenNthCalledWith(1, { by: ['stepNumber'], where, _count: { _all: true } });
    expect(groupBy).toHaveBeenNthCalledWith(2, { by: ['stepNumber'], where: {
      ...where, mediaCandidates: { some: { centerId, templateId, templateVersion: 7,
        kind: 'ACTIVITY_IMAGE', status: 'QUARANTINED', revokedAt: null } },
    }, _count: { _all: true } });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
  });
  it('does not query private mappings after authorization denial', async () => {
    const { service, groupBy, auth } = setup();
    auth.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.mapping(centerId, viewer as never, templateId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(groupBy).not.toHaveBeenCalled();
  });
});
