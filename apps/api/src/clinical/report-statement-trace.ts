import { orderedJsonFingerprint as hash } from '../common/fingerprints';
import type { Evidence } from './reports.service';
import { suggestionSources, type Section } from './report-source-catalog';

const SECTIONS: Section[] = ['assessment', 'goals', 'sessions'];
export type TraceStatus = 'LINKED_TO_SAVED_TEXT' | 'SECTION_EDITED' | 'SOURCE_MISMATCH' | 'PASSAGE_MISMATCH';
export type ClaimTrace = { index: number; text: string; sources: { ref: string; label: string }[] };
export type SectionTrace = { section: Section; status: TraceStatus; decisionId: string;
  passage: string | null; claims: ClaimTrace[]; claimValidation: 'REFERENCED_NOT_VERIFIED' };
export type TraceDecision = {
  id: string; section: string; action: string; sectionHash: string; passageHash: string | null;
  claimMap: unknown; sourceManifest: unknown;
};
function claimTextParts(passage: string, hashes: string[]): string[] | null {
  if (!hashes.length || hashes.length > 12) return null;
  // A claim may have embedded newlines. Only paragraph separators that
  // reproduce EVERY exact stored text hash are accepted as boundaries.
  function visit(pos: number, index: number): string[] | null {
    if (index === hashes.length - 1) {
      const tail = passage.slice(pos);
      return hash(tail) === hashes[index] ? [tail] : null;
    }
    for (let cut = passage.indexOf('\n\n', pos); cut >= 0; cut = passage.indexOf('\n\n', cut + 2)) {
      const text = passage.slice(pos, cut);
      if (hash(text) !== hashes[index]) continue;
      const rest = visit(cut + 2, index + 1);
      if (rest) return [text, ...rest];
    }
    return null;
  }
  return visit(0, 0);
}
function sourcePassage(sectionText: string, kind: Section, expectedHash: string): string | null {
  const marker = 'Evidence references (internal draft; ' + kind + '):';
  const legacy = 'Evidence references (internal draft):';
  const at = sectionText.lastIndexOf(marker);
  const fallback = at < 0 ? sectionText.lastIndexOf(legacy) : at;
  if (fallback < 0) return null;
  const left = sectionText.slice(0, fallback).trimEnd();
  const starts = [0];
  for (let i = left.indexOf('\n\n'); i >= 0; i = left.indexOf('\n\n', i + 2)) starts.push(i + 2);
  // The authoring transaction APPENDS the passage before reference lines.
  // Never guess the passage if its exact cryptographic hash cannot be found.
  for (const start of starts) {
    const candidate = left.slice(start);
    if (hash(candidate) === expectedHash) return candidate;
  }
  return null;
}

export function traceSavedStatements(sections: Record<string, string>, snapshot: Evidence,
  decisions: TraceDecision[], reportId: string): SectionTrace[] {
  return SECTIONS.flatMap(section => {
    const applied = decisions.filter(d => d.section === section && d.action === 'APPLIED');
    if (!applied.length) return [];
    const savedText = typeof sections[section] === 'string' ? sections[section] : '';
    const decision = applied.find(d => d.sectionHash === hash(savedText)) ?? applied[0];
    const base = { section, decisionId: decision.id, claimValidation: 'REFERENCED_NOT_VERIFIED' as const };
    const fail = (status: Exclude<TraceStatus, 'LINKED_TO_SAVED_TEXT'>): SectionTrace =>
      ({ ...base, status, passage: null, claims: [] });
    if (decision.sectionHash !== hash(savedText)) return [fail('SECTION_EDITED')];
    if (!decision.passageHash || !/^[a-f0-9]{64}$/.test(decision.passageHash))
      return [fail('PASSAGE_MISMATCH')];
    const passage = sourcePassage(savedText, section, decision.passageHash);
    if (!passage) return [fail('PASSAGE_MISMATCH')];
    const rawClaims = decision.claimMap;
    const rawManifest = decision.sourceManifest;
    if (!Array.isArray(rawClaims) || !Array.isArray(rawManifest) || !rawClaims.length)
      return [fail('SOURCE_MISMATCH')];
    const savedSources = new Map(suggestionSources(snapshot, reportId, section).map(s => [s.ref, s]));
    const manifest = new Map<string, string>();
    for (const item of rawManifest) {
      if (!item || typeof item.ref !== 'string' || typeof item.fingerprint !== 'string')
        return [fail('SOURCE_MISMATCH')];
      manifest.set(item.ref, item.fingerprint);
    }
    const indices = rawClaims.map((c: { index?: unknown }) => c?.index);
    if (indices.some((n, i) => n !== i)) return [fail('SOURCE_MISMATCH')];
    const hashes = rawClaims.map((c: { textHash?: unknown }) => c?.textHash);
    if (hashes.some(x => typeof x !== 'string' || !/^[a-f0-9]{64}$/.test(x)))
      return [fail('PASSAGE_MISMATCH')];
    const parts = claimTextParts(passage, hashes as string[]);
    if (!parts) return [fail('PASSAGE_MISMATCH')];
    const claims: ClaimTrace[] = [];
    for (let i = 0; i < rawClaims.length; i++) {
      const refs: unknown = rawClaims[i]?.sourceRefs;
      if (!Array.isArray(refs) || !refs.length || refs.length > 20 ||
          refs.some(x => typeof x !== 'string')) return [fail('SOURCE_MISMATCH')];
      const sources: ClaimTrace['sources'] = [];
      for (const ref of refs as string[]) {
        const saved = savedSources.get(ref);
        if (!saved || manifest.get(ref) !== saved.fingerprint) return [fail('SOURCE_MISMATCH')];
        sources.push({ ref, label: saved.label });
      }
      claims.push({ index: i + 1, text: parts[i], sources });
    }
    return [{ ...base, status: 'LINKED_TO_SAVED_TEXT', passage, claims }];
  });
}
