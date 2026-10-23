import { ForbiddenException } from '@nestjs/common';
import { DisabledClinicalAiProvider, type SyntheticAssistRequest } from '../src/clinical/ai-provider';

describe('TB-EM-019 disabled clinical AI provider policy', () => {
  const synthetic: SyntheticAssistRequest = {
    synthetic: true, centerId: 'fictional-center', childId: 'fictional-child',
    service: 'speech', planVersionId: 'fictional-plan-v1',
    evidence: [{ sourceId: 'fake-obs-01', fact: 'Synthetic observation only' }],
  };

  it('denies all report and home-plan generation irrespective of environment flags', async () => {
    const previous = process.env.CLINICAL_AI_ENABLED;
    try {
      process.env.CLINICAL_AI_ENABLED = 'true';
      const provider = new DisabledClinicalAiProvider();
      expect(provider.capabilities()).toEqual({
        provider: 'disabled', reportDrafting: false,
        homePlanDrafting: false, externalProcessing: false,
      });
      await expect(provider.suggestReport(synthetic)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(provider.suggestHomePlan(synthetic)).rejects.toBeInstanceOf(ForbiddenException);
    } finally {
      if (previous === undefined) delete process.env.CLINICAL_AI_ENABLED;
      else process.env.CLINICAL_AI_ENABLED = previous;
    }
  });
});
