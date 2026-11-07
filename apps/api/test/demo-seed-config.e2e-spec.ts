import { randomBytes } from 'node:crypto';
import { assertDemoAllowed, DEMO_EMAILS, DEMO_EXTRA_EMAILS, parseHostedDemoPasswords, parseExtraHostedDemoPasswords, seedChildrensHome } from '../src/cli/seed-demo';

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
  test('a seven-only operator secret cannot create unexported random extra therapist hashes in local mode',async()=>{
    const keys=['DEPLOYMENT_ENV','DEMO_SEED_CONFIRM','DATABASE_URL','DEMO_PASSWORDS_JSON','DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
    const transaction=jest.fn();
    try{
      process.env.DEPLOYMENT_ENV='ci';
      process.env.DEMO_SEED_CONFIRM='CHILDRENS_HOME_SYNTHETIC_ONLY';
      process.env.DATABASE_URL='postgresql://test:test@localhost:5432/therabridge_demo_test';
      process.env.DEMO_PASSWORDS_JSON=JSON.stringify(valid());
      delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
      await expect(seedChildrensHome({$transaction:transaction} as any))
        .rejects.toThrow(/require DEMO_EXTRA_PASSWORDS_JSON/);
      expect(transaction).not.toHaveBeenCalled();
    } finally{
      for(const key of keys)if(saved[key]===undefined)delete process.env[key];
      else process.env[key]=saved[key];
    }
  });
  test('requires three independent high-entropy therapist passwords on hosted preview',()=>{
    expect(()=>parseExtraHostedDemoPasswords(preview({}))).toThrow(/DEMO_EXTRA_PASSWORDS_JSON/);
    expect(parseExtraHostedDemoPasswords({DEPLOYMENT_ENV:'ci'})).toBeNull();
    const correct=Object.fromEntries(Object.values(DEMO_EXTRA_EMAILS).map(email=>[email,'demo-'+randomBytes(24).toString('base64url')]));
    expect(parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(correct)}))).toEqual(correct);
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:'not-json'}))).toThrow();
    const missing={...correct};delete missing[DEMO_EXTRA_EMAILS.aba2];
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(missing)}))).toThrow();
    const reused={...correct,[DEMO_EXTRA_EMAILS.ot2]:correct[DEMO_EXTRA_EMAILS.aba2]};
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(reused)}))).toThrow();
    const weak={...correct,[DEMO_EXTRA_EMAILS.speech2]:'password123'};
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(weak)}))).toThrow();
  });
});
