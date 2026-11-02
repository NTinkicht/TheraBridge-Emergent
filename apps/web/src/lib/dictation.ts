// No Web Speech API: implementations may send identifiable audio to browser vendors.
// No microphone, audio retention, uploads, external processing or credentials in this synthetic mode.
export type DictationScenario = 'success' | 'permission' | 'unavailable' | 'unsupported' | 'interrupted' | 'empty' | 'provider' | 'network';
export type DictationLanguage = 'en' | 'ar' | 'fr';
export type CaptureState = 'IDLE' | 'SIMULATING' | 'PAUSED' | 'READY';
export const DICTATION_LANGUAGES: ReadonlyArray<{ value: DictationLanguage; label: string }> = Object.freeze([
  { value: 'en', label: 'English (synthetic)' }, { value: 'ar', label: 'Arabic (synthetic)' },
  { value: 'fr', label: 'French (synthetic)' },
]);
export function nextCaptureState(state: CaptureState, action: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET'): CaptureState {
  if (action === 'RESET') return 'IDLE';
  if (action === 'START' && state === 'IDLE') return 'SIMULATING';
  if (action === 'PAUSE' && state === 'SIMULATING') return 'PAUSED';
  if (action === 'RESUME' && state === 'PAUSED') return 'SIMULATING';
  if (action === 'STOP' && (state === 'SIMULATING' || state === 'PAUSED')) return 'READY';
  throw new Error('Invalid synthetic capture transition. No audio was captured.');
}
export interface CaptureProvider { capture(signal: AbortSignal): Promise<Blob>; }
export interface TranscriptionProvider { readonly mode: string; transcribe(input: { syntheticFixture: string; language?: DictationLanguage }, signal: AbortSignal): Promise<string>; }
export const realMicrophone: CaptureProvider = { async capture() { throw new Error('Real microphone capture is disabled pending signed audio-processing, consent and retention decisions.'); } };
const errors: Partial<Record<DictationScenario, string>> = {
  permission: 'Microphone permission denied (synthetic test). Check permissions after approved activation.',
  unavailable: 'No microphone available (synthetic test). Use typed notes.',
  unsupported: 'Speech capture is unsupported (synthetic test). Use typed notes.',
  interrupted: 'Recording interrupted (synthetic test). Your editable text is preserved; retry when ready.',
  provider: 'Transcription provider failed (synthetic test). Retry or type your note.',
  network: 'Network failure (synthetic test). Your text is preserved; retry when connected.',
};
export function syntheticProvider(scenario: DictationScenario): TranscriptionProvider {
  return { mode: 'SYNTHETIC_FIXTURE_ONLY', async transcribe(input, signal) {
    if (typeof input.syntheticFixture !== 'string' || Array.from(input.syntheticFixture).length > 4000 ||
      !input.syntheticFixture.trim() || (input.language && !['en','ar','fr'].includes(input.language)))
      throw new Error('Invalid fictional transcript fixture.');
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 250);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Cancelled. Your editable text is preserved.')); }, { once: true });
    });
    if (signal.aborted) throw new Error('Cancelled.');
    if (errors[scenario]) throw new Error(errors[scenario]);
    return scenario === 'empty' ? '' : input.syntheticFixture;
  } };
}
export const SYNTHETIC_SPEECH = 'Synthetic practice: the child took three turns with substantial assistance.';
export const SYNTHETIC_SPEECH_BY_LANGUAGE: Readonly<Record<DictationLanguage, string>> = Object.freeze({
  en: SYNTHETIC_SPEECH,
  ar: 'تجربة خيالية: شارك الطفل في ثلاثة أدوار بمساعدة كبيرة.',
  fr: 'Exercice fictif : l’enfant a participé à trois tours avec une aide importante.',
});
