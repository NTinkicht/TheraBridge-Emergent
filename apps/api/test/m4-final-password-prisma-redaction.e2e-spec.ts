// M4-08 final quality qualification: real source execution of password-policy and
// database-error redaction boundaries. No application server, clinical fixtures,
// real accounts, or secrets are used.
import { Prisma } from '@prisma/client';
import type { ArgumentsHost } from '@nestjs/common';
import { passwordPolicyError, verifyPassword, needsRehash, hashPassword, dummyHash } from '../src/auth/password';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';

describe('M4-08 actual password policy branches and safe verification', () => {
  const email='synthetic.user@example.invalid';
  it.each([
    ['under minimum', 'short', 'Use at least 12 characters.'],
    ['over maximum', 'a'.repeat(129), 'Use at most 128 characters.'],
    ['exact boundary minimum', 'longfictional', null],
    ['exact boundary maximum', 'Z'.repeat(128), null],
    ['mixed case email local part', 'prefixSYNTHETIC.USERsuffix', 'Do not include your email name in the password.'],
    ['different email local part', 'anunrelatedfictionalphrase', null],
    ['email with empty local part', 'correct fictional pass', null],
    ['email with two-letter local part', 'xy-fictional-longphrase', null],
    ['valid unicode codepoint length', '🔒'.repeat(12), null],
    ['short unicode codepoint length', '🔒'.repeat(11), 'Use at least 12 characters.'],
  ])('%s',(_name,password,result)=>{
    const effectiveEmail=_name==='email with empty local part'?'@example.invalid':
      _name==='email with two-letter local part'?'xy@example.invalid':email;
    expect(passwordPolicyError(password,effectiveEmail)).toBe(result);
  });

  it('rejects a deliberately common password regardless of letter case',()=>{
    expect(passwordPolicyError('PASSWORD123456','fake@example.invalid')).toMatch(/common|email name/i);
  });

  it('hashes with the production Argon2id configuration and fails incorrect passwords',async()=>{
    const clear='fictional-test-string-2026';
    const hash=await hashPassword(clear);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash,clear)).toBe(true);
    expect(await verifyPassword(hash,'wrong-fictional-string')).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });

  it('malformed or unsupported hashes cannot produce successful authentication',async()=>{
    await expect(verifyPassword('invalid-hash','anything')).resolves.toBe(false);
  });

  it('unknown account dummy work returns one memoized hash promise',async()=>{
    const one=dummyHash();
    const two=dummyHash();
    expect(two).toBe(one);
    const hash=await one;
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash,'fictional-unrelated')).toBe(false);
  });
});

describe('M4-08 actual Prisma exception redaction for all known branches',()=>{
  const cases: Array<[string,number,string,string|undefined]>=[
    ['P2002',409,'Conflict','UNIQUE_CONSTRAINT_CONFLICT'],
    ['P2003',400,'Bad Request','INVALID_REFERENCE'],
    ['P2014',409,'Conflict',undefined],
    ['P2025',404,'Not Found',undefined],
    ['P2010',500,'Internal Server Error',undefined],
    ['P9999',500,'Internal Server Error',undefined],
  ];
  it.each(cases)('maps %s to safe HTTP %d without leaking private metadata',(code,status,name,expectedCode)=>{
    const sent: unknown[]=[];
    const send=jest.fn((body:unknown)=>{sent.push(body);return undefined;});
    const setCode=jest.fn().mockReturnValue({send});
    const host={
      switchToHttp:()=>({getResponse:()=>({code:setCode})})
    } as unknown as ArgumentsHost;
    const error=new Prisma.PrismaClientKnownRequestError(
      'PRIVATE INTERNAL SQL: SELECT * FROM secret_records WHERE token=SECRET',
      {code,clientVersion:'5.22.0',meta:{target:'secret_records',constraint:'secret_token'}}
    );
    new PrismaExceptionFilter().catch(error,host);
    expect(setCode).toHaveBeenCalledWith(status);
    expect(send).toHaveBeenCalledTimes(1);
    const body=sent[0] as Record<string,unknown>;
    expect(body.statusCode).toBe(status);
    expect(body.error).toBe(name);
    if(expectedCode) expect(body.code).toBe(expectedCode);
    else expect(body).not.toHaveProperty('code');
    const serialized=JSON.stringify(body);
    for(const secret of ['secret_records','secret_token','SECRET','PRIVATE INTERNAL SQL']){
      expect(serialized).not.toContain(secret);
    }
    expect(body.message).toEqual(expect.any(String));
  });
});
