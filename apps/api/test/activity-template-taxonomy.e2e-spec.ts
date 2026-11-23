import { ClinicalService } from '../src/clinical/clinical.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { TrialService } from '../src/operations/trial.service';

describe('M5-12 activity taxonomy discovery on authorized server catalogue', () => {
  const centerId = '00000000-0000-4000-8000-000000000001';
  it('AND-filters specialty, category, skill, equipment and keeps tenant scope', async () => {
    const findMany = jest.fn(async (_args?: unknown) => []);
    const service = new ClinicalService({
      activityTemplate: { findMany },
    } as unknown as PrismaService, {} as TrialService);
    await service.templatePage(centerId, undefined, {
      service: 'speech', category: 'Picture choice', skill: 'Turn taking',
      equipment: 'Fictional cards', limit: 20,
    });
    const input = findMany.mock.calls[0]?.[0] as unknown as {
      where: { AND: unknown[] }; take: number;
    };
    expect(input.take).toBe(21);
    expect(input.where.AND).toEqual(expect.arrayContaining([
      { OR: [{ centerId }, { centerId: null }] },
      { service: 'speech' },
      { category: { equals: 'Picture choice', mode: 'insensitive' } },
      { skill: { equals: 'Turn taking', mode: 'insensitive' } },
      { equipment: { has: 'Fictional cards' } },
    ]));
  });
  it('retains unknown category/skill for existing activities rather than fabricating clinical taxonomy', async () => {
    const findMany = jest.fn(async () => [{
      id: 'synthetic-activity', title: 'Choice cards', service: 'speech',
      centerId: null, createdById: null, ageBand: 'sample', minutes: 5,
      category: null, skill: null, equipment: [], materials: [], steps: ['Choose'], safety: ['Observe'], version: 1,
    }]);
    const service = new ClinicalService({
      activityTemplate: { findMany },
    } as unknown as PrismaService, {} as TrialService);
    const result = await service.templatePage(centerId);
    expect(result.items[0]).toEqual(expect.objectContaining({
      category: null, skill: null, equipment: [], library: 'synthetic',
    }));
  });
});
