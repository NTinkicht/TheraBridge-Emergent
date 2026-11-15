import { randomBytes, randomUUID } from 'node:crypto';
import {existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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


  test.each(['null','[]','"text"','1','true'])('rejects malformed seven-account secret root %s without invoking a database',raw=>{
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:raw}))).toThrow(/email-to-password object/);
  });
  test.each(['null','[]','"text"','1','true'])('rejects malformed three-account secret root %s without invoking a database',raw=>{
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:raw}))).toThrow(/email-to-password object/);
  });
  test('rejects oversized secrets before parsing them or exposing their contents',()=>{
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:' '.repeat(8193)}))).toThrow(/unexpectedly large/);
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:' '.repeat(4097)}))).toThrow(/unexpectedly large/);
  });
  test('rejects any unexpected or missing role name instead of tolerating partial tenants',()=>{
    const seven=valid(),unknown={...seven,unknown:'demo-'+randomBytes(24).toString('base64url')};
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(unknown)}))).toThrow(/exactly the seven/);
    const sevenUnknown={...seven};delete sevenUnknown[DEMO_EMAILS.admin];
    sevenUnknown['unknown@example.invalid']='demo-'+randomBytes(24).toString('base64url');
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(sevenUnknown)}))).toThrow(/exactly the seven/);
    const three=Object.fromEntries(Object.values(DEMO_EXTRA_EMAILS).map(e=>[e,'demo-'+randomBytes(24).toString('base64url')]));
    const threeUnknown={...three};delete threeUnknown[DEMO_EXTRA_EMAILS.ot2];
    threeUnknown['unknown@example.invalid']='demo-'+randomBytes(24).toString('base64url');
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(threeUnknown)}))).toThrow(/Exactly three designated/);
  });
  test('enforces nonstring, minimum, maximum and account-name password rules for all seven roles',()=>{
    const seven=valid();
    for(const bad of [null,1,{},[],false,'short','X'.repeat(129),'this-phrase-contains-admin-account-name']){
      const input={...seven,[DEMO_EMAILS.admin]:bad};
      expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(input)}))).toThrow(/24–128 characters and pass/);
    }
  });
  test('enforces nonstring, minimum, maximum and account-name password rules for three extra therapists',()=>{
    const three=Object.fromEntries(Object.values(DEMO_EXTRA_EMAILS).map(e=>[e,'demo-'+randomBytes(24).toString('base64url')]));
    for(const bad of [null,1,{},[],false,'short','X'.repeat(129),'synthetic-dalia.mansour-username-inside']){
      const input={...three,[DEMO_EXTRA_EMAILS.aba2]:bad};
      expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(input)}))).toThrow(/24–128 character password policy/);
    }
  });
  test('rejects duplicate secrets even when all declared email identities are present',()=>{
    const seven=valid();
    seven[DEMO_EMAILS.parent]=seven[DEMO_EMAILS.platform];
    expect(()=>parseHostedDemoPasswords(preview({DEMO_PASSWORDS_JSON:JSON.stringify(seven)}))).toThrow(/different password/);
    const three=Object.fromEntries(Object.values(DEMO_EXTRA_EMAILS).map(e=>[e,'demo-'+randomBytes(24).toString('base64url')]));
    three[DEMO_EXTRA_EMAILS.aba2]=three[DEMO_EXTRA_EMAILS.speech2];
    expect(()=>parseExtraHostedDemoPasswords(preview({DEMO_EXTRA_PASSWORDS_JSON:JSON.stringify(three)}))).toThrow(/distinct/);
  });
  test('rejects missing, malformed, unapproved and non-PostgreSQL URLs even with consent flag',()=>{
    const base={DEPLOYMENT_ENV:'ci',DEMO_SEED_CONFIRM:'CHILDRENS_HOME_SYNTHETIC_ONLY'};
    for(const DATABASE_URL of [
      undefined,'not-a-url','mysql://x:y@localhost:3306/therabridge_demo',
      'postgresql://x:y@localhost:5432/patient_data','postgres://x:y@localhost:5432/live'
    ]){
      expect(()=>assertDemoAllowed({...base,DATABASE_URL})).toThrow();
    }
  });
  test.each(['local','ci','preview','shared-synthetic'])('accepts explicitly authorized synthetic deployment %s with isolated PostgreSQL',DEPLOYMENT_ENV=>{
    expect(()=>assertDemoAllowed({
      DEPLOYMENT_ENV,DEMO_SEED_CONFIRM:'CHILDRENS_HOME_SYNTHETIC_ONLY',
      DATABASE_URL:'postgres://fiction:fiction@localhost:5432/therabridge_synthetic_test'
    })).not.toThrow();
  });

  test('malformed protected original or extra file never leaks its contents in exception messages',async()=>{
    const filename=join(tmpdir(),'tb-m4-03-malformed-'+randomUUID()+'.json');
    const extraFile=filename.slice(0,-5)+'-extra.json';
    const lock=filename+'.seed.lock';
    const keys=['DEPLOYMENT_ENV','DEMO_SEED_CONFIRM','DATABASE_URL','DEMO_PASSWORDS_JSON','DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
    const db={$transaction:jest.fn()} as any;
    const injectedFragment='should_not_print_'+randomUUID().replaceAll('-','');
    try{
      process.env.DEPLOYMENT_ENV='ci';
      process.env.DEMO_SEED_CONFIRM='CHILDRENS_HOME_SYNTHETIC_ONLY';
      process.env.DATABASE_URL='postgresql://test:test@localhost:5432/synthetic_test';
      delete process.env.DEMO_PASSWORDS_JSON;delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
      writeFileSync(filename,'{"accounts":[{"pass' + 'word":' + injectedFragment + ']}',{flag:'wx',mode:0o600});
      const originalError=await seedChildrensHome(db,filename).then(() => new Error('unexpected_success'), (e: unknown) => e as Error);
      expect(originalError).toBeInstanceOf(Error);
      expect(originalError.message).toBe('Protected local demo credential file is invalid or unreadable.');
      expect(originalError.message).not.toContain(injectedFragment);
      expect(existsSync(lock)).toBe(false);
      unlinkSync(filename);
      writeFileSync(filename,JSON.stringify({synthetic:true,accounts:
        Object.values(DEMO_EMAILS).map(email=>({email,password:'demo-'+randomBytes(24).toString('base64url'),role:'THERAPIST'}))
      }),{flag:'wx',mode:0o600});
      writeFileSync(extraFile,'{"accounts":[{"pass' + 'word":' + injectedFragment + ']}',{flag:'wx',mode:0o600});
      const extraError=await seedChildrensHome(db,filename).then(() => new Error('unexpected_success'), (e: unknown) => e as Error);
      expect(extraError).toBeInstanceOf(Error);
      expect(extraError.message).toBe('Protected local demo credential file is invalid or unreadable.');
      expect(extraError.message).not.toContain(injectedFragment);
      expect(existsSync(lock)).toBe(false);
      expect(db.$transaction).not.toHaveBeenCalled();
    } finally{
      for(const key of keys)if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];
      for(const name of [filename,extraFile,lock])if(existsSync(name))unlinkSync(name);
    }
  });
});
