import { ForbiddenException, Injectable } from '@nestjs/common';

// Interface only. These requests remain fictional until clinical policy,
// residency, retention, consent and subprocessor decisions are approved.
export interface SyntheticAssistRequest {
  synthetic: true;
  centerId: string;
  childId: string;
  service: string;
  planVersionId?: string;
  evidence: ReadonlyArray<{ sourceId: string; fact: string }>;
}

export interface ClinicalAiDraft {
  mode: 'DRAFT_ONLY';
  content: string;
  sourceIds: string[];
  needsClinicianReview: true;
}

export interface ClinicalAiProvider {
  capabilities(): { provider: string; reportDrafting: boolean; homePlanDrafting: boolean; externalProcessing: boolean };
  suggestReport(request: SyntheticAssistRequest): Promise<ClinicalAiDraft>;
  suggestHomePlan(request: SyntheticAssistRequest): Promise<ClinicalAiDraft>;
}

export const CLINICAL_AI_PROVIDER = Symbol('CLINICAL_AI_PROVIDER');

// DO NOT replace via environment-variable checks. Integration with any external
// provider requires a separate reviewed implementation and owner authorization.
// No network SDK, transport layer or credential handling exists in this module.
@Injectable()
export class DisabledClinicalAiProvider implements ClinicalAiProvider {
  capabilities() {
    return { provider: 'disabled', reportDrafting: false, homePlanDrafting: false, externalProcessing: false };
  }
  suggestReport(_request: SyntheticAssistRequest): Promise<ClinicalAiDraft> {
    return Promise.reject(new ForbiddenException('Clinical AI generation is disabled pending owner-approved privacy and clinical policies.'));
  }
  suggestHomePlan(_request: SyntheticAssistRequest): Promise<ClinicalAiDraft> {
    return Promise.reject(new ForbiddenException('Clinical AI generation is disabled pending owner-approved privacy and clinical policies.'));
  }
}
