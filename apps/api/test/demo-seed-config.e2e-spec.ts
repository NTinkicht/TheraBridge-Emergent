import { randomBytes } from 'node:crypto';
import { assertDemoAllowed, DEMO_EMAILS, parseHostedDemoPasswords } from '../src/cli/seed-demo';

const valid = () => Object.fromEntries(Object.values(DEMO_EMAILS).map(e=>[e,'demo-'+randomBytes(24).toString('base64url')]));
const preview=(v: object): Record<string,string|undefined>=>({DEPLOYMENT_ENV:'preview',...v});

describe('synthetic hosted preview bootstrap policy',()=>{
  test('requires a non-production env, explicit acknowledgment and named disposable DB',()=>{
    const validEnv={DEPLOYMENT_ENV:'preview',DEMO_SEED_CONFIRM:'CHILDRENS_HOME_SYNTHETIC_ONLY',DATABASE_URL:'postgresql://fiction:secret@localhost:5432/therabridge_demo_preview'};
    expect(()=>assertDemoAllowed(validEnv)).not.toThrow();
    expect(()=>assertDemoAllowed({...validEnv,DEPLOYMENT_ENV:'production'})).toThrow();
    expect(()=>assertDemoAllowed({...validEnv,DEMO_SEED_CONFIRM:undefined})).toThrow();
    expect(()=>assertDemoAllowed({...validEnv,DATABASE_URL:'postgresql://x:y@localhost:5432/patients'})).toThrow();
  });
  test('prevents ephemeral generated login secrets in hosted preview',()=>{
    expect(()=>parseHostedDemoPasswords(preview({}))).toThrow(/requires DEMO_PASSWORDS_JSON/);
    expect(parseHostedDemoPasswords({DEPLOYMENT_ENV:'ci'})).toBeNull();
  });
  test('requires exactly seven distinct strong fictional passwords',()=>{
    const correct=valid();
    expect(parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(correct)}))).toEqual(correct);
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:'invalid json'}))).toThrow();
    const missing={...correct};
    delete missing[DEMO_EMAILS.parent];
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(missing)}))).toThrow();
    const reused={...correct,[DEMO_EMAILS.parent]:correct[DEMO_EMAILS.admin]};
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(reused)}))).toThrow();
    const weak={...correct,[DEMO_EMAILS.parent]:'password123'};
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(weak)}))).toThrow();
  });
});
