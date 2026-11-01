import { createHash } from 'node:crypto';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import type { ClinicalAiDraft, SyntheticAssistRequest } from './ai-provider';

/** M3-AI01: deterministic synthetic architecture contract. No network or real patient input. */
export type AssistTask = 'REPORT_DRAFT' | 'HOME_PLAN_DRAFT';
export const SYNTHETIC_PROMPTS = Object.freeze({
  REPORT_DRAFT: Object.freeze({ version: 'm3-ai01-report-v1', instruction:
    'Draft fictional report text only from supplied fictional facts. Cite each source. A clinician must review.' }),
  HOME_PLAN_DRAFT: Object.freeze({ version: 'm3-ai01-home-plan-v1', instruction:
    'Draft fictional home-plan activities only from supplied fictional facts. Cite each source. A clinician must review.' }),
});
export const SYNTHETIC_AI_LIMITS = Object.freeze({ maxEvidence: 20, maxFactChars: 500,
  maxTotalChars: 4000, maxOutputChars: 3000 });

export interface PreparedSyntheticAssist {
  readonly task: AssistTask;
  readonly promptVersion: string;
  readonly promptFingerprint: string;
  readonly requestFingerprint: string;
  readonly evidence: ReadonlyArray<Readonly<{ sourceId: string; fact: string }>>;
}

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

/** Server-side entry gate; environment flags never enable external clinical AI. */
export function prepareSyntheticAssist(task: AssistTask, request: SyntheticAssistRequest): PreparedSyntheticAssist {
  if (process.env.DEPLOYMENT_ENV === 'production' || process.env.DEPLOYMENT_ENV === 'staging' ||
    process.env.TB_AI_SYNTHETIC !== 'true' || request?.synthetic !== true) {
    throw new ForbiddenException('Synthetic AI assistance is disabled.');
  }
  const ids = [request.centerId, request.childId, request.service];
  if (ids.some(id => typeof id !== 'string' || !id.trim() || id.length > 100) ||
    (request.planVersionId !== undefined &&
      (typeof request.planVersionId !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(request.planVersionId))) ||
    !Array.isArray(request.evidence) || request.evidence.length === 0 ||
    request.evidence.length > SYNTHETIC_AI_LIMITS.maxEvidence) {
    throw new UnprocessableEntityException('Invalid synthetic AI request scope or evidence count.');
  }
  const seen = new Set<string>();
  let total = 0;
  const evidence = request.evidence.map(item => {
    if (!item || typeof item.sourceId !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(item.sourceId) ||
      seen.has(item.sourceId) || typeof item.fact !== 'string' || !item.fact.trim() ||
      item.fact.length > SYNTHETIC_AI_LIMITS.maxFactChars) {
      throw new UnprocessableEntityException('Invalid or duplicate synthetic evidence.');
    }
    seen.add(item.sourceId);
    total += item.fact.length;
    return Object.freeze({ sourceId: item.sourceId, fact: item.fact.trim() });
  });
  if (total > SYNTHETIC_AI_LIMITS.maxTotalChars) {
    throw new UnprocessableEntityException('Synthetic evidence exceeds the bounded budget.');
  }
  const prompt = SYNTHETIC_PROMPTS[task];
  if (!prompt) throw new UnprocessableEntityException('Unknown AI task.');
  return Object.freeze({ task, promptVersion: prompt.version,
    promptFingerprint: sha(prompt.version + '\n' + prompt.instruction),
    requestFingerprint: sha(JSON.stringify([task, prompt.version, request.centerId,
      request.childId, request.service, request.planVersionId ?? null, evidence])),
    evidence: Object.freeze(evidence) });
}

/** An offline fixture, never a patient-facing or clinically actionable generated document. */
export function syntheticFixtureDraft(prepared: PreparedSyntheticAssist): ClinicalAiDraft {
  const prefix = prepared.task === 'REPORT_DRAFT' ? 'Fictional report draft' : 'Fictional home-plan draft';
  const content = `${prefix} — NOT CLINICALLY VALIDATED\n` +
    prepared.evidence.map(e => `[${e.sourceId}] ${e.fact}`).join('\n');
  if (content.length > SYNTHETIC_AI_LIMITS.maxOutputChars) {
    throw new UnprocessableEntityException('Synthetic draft exceeds output budget.');
  }
  return { mode: 'DRAFT_ONLY', content, sourceIds: prepared.evidence.map(e => e.sourceId),
    needsClinicianReview: true };
}
