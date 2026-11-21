// M4-08 synthetic dictation is not voice capture. Keep microphone and providers fail-closed.
const {nextCaptureState,realMicrophone,syntheticProvider,DICTATION_LANGUAGES,
 SYNTHETIC_SPEECH,SYNTHETIC_SPEECH_BY_LANGUAGE}=require('../src/lib/dictation');

describe('M4-08: synthetic-only dictation state machine and privacy',()=>{
 it('permits only explicit capture transitions; reset always cancels',()=>{
  expect(nextCaptureState('IDLE','START')).toBe('SIMULATING');
  expect(nextCaptureState('SIMULATING','PAUSE')).toBe('PAUSED');
  expect(nextCaptureState('PAUSED','RESUME')).toBe('SIMULATING');
  expect(nextCaptureState('SIMULATING','STOP')).toBe('READY');
  expect(nextCaptureState('PAUSED','STOP')).toBe('READY');
  expect(nextCaptureState('READY','RESET')).toBe('IDLE');
  expect(()=>nextCaptureState('READY','START')).toThrow(/No audio was captured/);
  expect(()=>nextCaptureState('IDLE','PAUSE')).toThrow(/No audio was captured/);
 });
 it('cannot activate a real microphone before signed processing and consent gates',async()=>{
  await expect(realMicrophone.capture()).rejects.toThrow(/disabled pending signed/);
  expect(DICTATION_LANGUAGES.map(x=>x.value)).toEqual(['en','ar','fr']);
  expect(SYNTHETIC_SPEECH_BY_LANGUAGE.en).toBe(SYNTHETIC_SPEECH);
 });
 it('allows only bounded fictional transcript fixtures with supported languages',async()=>{
  const provider=syntheticProvider('success');
  const abort=new AbortController();
  expect(provider.mode).toBe('SYNTHETIC_FIXTURE_ONLY');
  await expect(provider.transcribe({syntheticFixture:'Fictional draft',language:'fr'},abort.signal))
    .resolves.toBe('Fictional draft');
  await expect(provider.transcribe({syntheticFixture:' ',language:'en'},abort.signal))
    .rejects.toThrow(/Invalid fictional/);
  await expect(provider.transcribe({syntheticFixture:'A'.repeat(4001)},abort.signal))
    .rejects.toThrow(/Invalid fictional/);
  await expect(provider.transcribe({syntheticFixture:'Example',language:'unsupported'},abort.signal))
    .rejects.toThrow(/Invalid fictional/);
 });
 it('preserves cancel and simulated provider failure semantics without audio upload',async()=>{
  const abort=new AbortController();
  const operation=syntheticProvider('success').transcribe({syntheticFixture:'Synthetic'},abort.signal);
  abort.abort();
  await expect(operation).rejects.toThrow(/Cancelled/);
  await expect(syntheticProvider('network').transcribe({syntheticFixture:'Synthetic'},new AbortController().signal))
    .rejects.toThrow(/Network failure/);
  await expect(syntheticProvider('empty').transcribe({syntheticFixture:'Synthetic'},new AbortController().signal))
    .resolves.toBe('');
 });
});
