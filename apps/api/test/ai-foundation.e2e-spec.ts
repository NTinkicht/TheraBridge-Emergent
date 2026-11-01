import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { prepareSyntheticAssist, SYNTHETIC_AI_LIMITS } from '../src/clinical/ai-foundation';
import { DisabledClinicalAiProvider, OfflineSyntheticClinicalAiProvider, type SyntheticAssistRequest } from '../src/clinical/ai-provider';

describe('M3-AI01 offline synthetic AI foundation', () => {
  const base: SyntheticAssistRequest = { synthetic: true, centerId: 'fictional-center',
    childId: 'fictional-child', service: 'speech', planVersionId: 'fictional-version',
    evidence: [{ sourceId: 'fictional-obs-1', fact: 'Fictional practice occurred.' }] };
  const previous = { flag: process.env.TB_AI_SYNTHETIC, deployment: process.env.DEPLOYMENT_ENV };
  afterAll(() => {
    if (previous.flag === undefined) delete process.env.TB_AI_SYNTHETIC;
    else process.env.TB_AI_SYNTHETIC = previous.flag;
    if (previous.deployment === undefined) delete process.env.DEPLOYMENT_ENV;
    else process.env.DEPLOYMENT_ENV = previous.deployment;
  });

  it('defaults closed and never turns on the registered clinical provider', async () => {
    delete process.env.TB_AI_SYNTHETIC;
    expect(() => prepareSyntheticAssist('REPORT_DRAFT', base)).toThrow(ForbiddenException);
    await expect(new DisabledClinicalAiProvider().suggestReport(base)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permits deterministic, cited, explicitly unvalidated offline fictional fixtures', async () => {
    process.env.TB_AI_SYNTHETIC = 'true'; process.env.DEPLOYMENT_ENV = 'ci';
    const provider = new OfflineSyntheticClinicalAiProvider();
    const report = await provider.suggestReport(base);
    const plan = await provider.suggestHomePlan(base);
    expect(report).toMatchObject({ mode: 'DRAFT_ONLY', needsClinicianReview: true,
      sourceIds: ['fictional-obs-1'] });
    expect(report.content).toContain('NOT CLINICALLY VALIDATED');
    expect(plan.content).toContain('Fictional home-plan draft');
    expect(prepareSyntheticAssist('REPORT_DRAFT', base).requestFingerprint)
      .toBe(prepareSyntheticAssist('REPORT_DRAFT', base).requestFingerprint);
    expect(prepareSyntheticAssist('REPORT_DRAFT', base).requestFingerprint)
      .not.toBe(prepareSyntheticAssist('HOME_PLAN_DRAFT', base).requestFingerprint);
  });

  it.each(['production', 'staging'])('blocks synthetic assistance in %s', deployment => {
    process.env.TB_AI_SYNTHETIC = 'true'; process.env.DEPLOYMENT_ENV = deployment;
    expect(() => prepareSyntheticAssist('REPORT_DRAFT', base)).toThrow(ForbiddenException);
  });

  it('rejects duplicate, unbounded and malformed evidence', () => {
    process.env.TB_AI_SYNTHETIC = 'true'; process.env.DEPLOYMENT_ENV = 'ci';
    const rejects = [
      { ...base, evidence: [...base.evidence, ...base.evidence] },
      { ...base, evidence: [{ sourceId: 'bad ref', fact: 'fake' }] },
      { ...base, evidence: [{ sourceId: 'x', fact: 'x'.repeat(SYNTHETIC_AI_LIMITS.maxFactChars + 1) }] },
      { ...base, evidence: [] },
      { ...base, centerId: '' },
    ];
    rejects.forEach(request => expect(() => prepareSyntheticAssist('REPORT_DRAFT', request)).toThrow(UnprocessableEntityException));
  });
});
