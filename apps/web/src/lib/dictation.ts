// No Web Speech API: implementations may send identifiable audio to browser vendors.
// No microphone, audio retention, uploads, external processing or credentials in this synthetic mode.
export type DictationScenario = 'success' | 'permission' | 'unavailable' | 'unsupported' | 'interrupted' | 'empty' | 'provider' | 'network';
export interface CaptureProvider { capture(signal: AbortSignal): Promise<Blob>; }
export interface TranscriptionProvider { readonly mode: string; transcribe(input: { syntheticFixture: string }, signal: AbortSignal): Promise<string>; }
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
