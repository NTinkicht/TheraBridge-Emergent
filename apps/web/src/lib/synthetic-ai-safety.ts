import type { SyntheticSourceRef } from './synthetic-source-integrity';

export interface SyntheticSafetyVerdict {
  readonly status: 'REVIEWABLE_FICTIONAL_DRAFT' | 'BLOCKED';
  readonly reasons: readonly string[];
  readonly clinicalValidation: false;
  readonly externalProcessing: false;
}

const hostile = [
  /ignore\s+(?:all\s+|the\s+)?(?:previous|prior|system)\s+instructions/i,
  /(?:reveal|print|disclose)\s+(?:the\s+)?(?:system\s+prompt|secret|api\s+key)/i,
  /you\s+are\s+now\s+(?:the\s+)?(?:system|developer|administrator)/i,
  /(?:bypass|override|disable)\s+(?:all\s+)?(?:authorization|permissions|consent|safeguarding|release\s+checks)/i,
  /<script\b|javascript\s*:|onerror\s*=/i,
];
const unsupported = [
  /\bguaranteed\s+(?:cure|recovery|treatment)\b/i,
  /\b(?:diagnosed\s+with|must\s+stop\s+(?:medication|medicine)|prescribe\s+\w+)\b/i,
];

/** Cautious deterministic pre-insertion checks, NOT clinical validation or prompt-injection proof. */
export function scanSyntheticDraft(text: string, sources: readonly SyntheticSourceRef[]): SyntheticSafetyVerdict {
  const reasons: string[] = [];
  if (typeof text !== 'string' || !text.trim() || text.length > 7000)
    reasons.push('Empty or oversized fictional proposal.');
  if (!sources.length || sources.length > 20 || sources.some(s => !s.id || !s.scope || s.validation !== 'REFERENCED_NOT_VERIFIED'))
    reasons.push('Missing or malformed source references.');
  const sourceText = sources.map(s => s.snapshot).join('\n');
  if (sourceText.length > 30000) reasons.push('Fictional source budget exceeded.');
  if (hostile.some(pattern => pattern.test(text) || pattern.test(sourceText)))
    reasons.push('Instruction-spoofing or executable content detected in proposed text or evidence.');
  if (unsupported.some(pattern => pattern.test(text) || pattern.test(sourceText)))
    reasons.push('Unsupported clinical certainty or prescribing language requires a separate clinician-authored record.');
  return {
    status: reasons.length ? 'BLOCKED' : 'REVIEWABLE_FICTIONAL_DRAFT',
    reasons, clinicalValidation: false, externalProcessing: false,
  };
}
