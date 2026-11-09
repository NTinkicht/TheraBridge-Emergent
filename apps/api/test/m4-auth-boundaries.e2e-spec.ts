// M4-08: Genuine API source execution for hard-deny auth, proxy identity and cookie boundaries.
// No database, HTTP server, protected user data or clinical release.
import {BlockList} from 'node:net';
import {can, permissionsFor, ROLES, CLINICAL_CAPABILITIES, syntheticMessagesTestFixtureOnly} from '../src/auth/policy';
import {parseCookies,cookie,clearCookie} from '../src/common/cookies';
import {randomToken,sha256,hmac,safeEqual,normalizeEmail,resolveClientIp,ipPrefix} from '../src/common/security';
import {passwordPolicyError,verifyPassword} from '../src/auth/password';

describe('M4-08: exact role-policy denies and unsigned clinical/messaging boundaries',()=>{
 const previous={DEPLOYMENT_ENV:process.env.DEPLOYMENT_ENV,FAMILY_MESSAGING_DEMO:process.env.FAMILY_MESSAGING_DEMO};
 afterEach(()=>{
  for(const [key,value] of Object.entries(previous)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 });
 it('rejects every unsigned clinical capability for every role, including platform administrator',()=>{
  for(const role of ROLES){
   for(const capability of CLINICAL_CAPABILITIES)expect(can(role,capability)).toBe(false);
   for(const capability of CLINICAL_CAPABILITIES)expect(permissionsFor(role)).not.toContain(capability);
   expect(can(role,'completely.unknown.capability')).toBe(false);
  }
 });
 it('restricts platform-only and synthetic family scopes to explicitly named roles',()=>{
  expect(can('PLATFORM_ADMIN','platform.centers.create')).toBe(true);
  expect(can('GUARDIAN','platform.centers.create')).toBe(false);
  expect(can('GUARDIAN','family.activities.read')).toBe(true);
  expect(can('THERAPIST','family.activities.read')).toBe(false);
  expect(can('THERAPIST','center.clinical.draft')).toBe(true);
  expect(can('CENTER_ADMIN','center.clinical.draft')).toBe(false);
  expect(can('CLINICAL_SUPERVISOR','center.clinical.review')).toBe(true);
  expect(can('THERAPIST','center.clinical.review')).toBe(false);
 });
 it('never enables unapproved messaging in any real environment or by flag alone',()=>{
  process.env.FAMILY_MESSAGING_DEMO='true';
  process.env.DEPLOYMENT_ENV='production';
  expect(syntheticMessagesTestFixtureOnly()).toBe(false);
  for(const role of ROLES){
   expect(can(role,'center.messages.use')).toBe(false);
   expect(can(role,'center.messages.manage')).toBe(false);
  }
  process.env.DEPLOYMENT_ENV='ci';
  process.env.FAMILY_MESSAGING_DEMO='false';
  expect(syntheticMessagesTestFixtureOnly()).toBe(false);
 });
});

describe('M4-08: cookie boundaries, source address and timing-safe comparisons',()=>{
 it('parses first cookie occurrence, decodes URL values and ignores malformed segments',()=>{
  expect(parseCookies(undefined)).toEqual({});
  const parsed=parseCookies(' ; tb_session=first%20value; malformed; tb_session=second; csrf=fake%3Dtoken; =bad');
  expect(parsed.tb_session).toBe('first value');
  expect(parsed.csrf).toBe('fake=token');
  expect(parsed).not.toHaveProperty('');
 });
 it('sets HttpOnly, SameSite, Path, Secure and explicit delete attributes correctly',()=>{
  const secure=cookie('__Host-tb_session','fictional value',{maxAgeSec:3600,secure:true});
  expect(secure).toContain('__Host-tb_session=fictional%20value');
  for(const x of ['Path=/','HttpOnly','SameSite=Lax','Max-Age=3600','Secure'])expect(secure).toContain(x);
  const local=cookie('tb_session','fake',{maxAgeSec:60,secure:false});
  expect(local).not.toContain('Secure');
  expect(clearCookie('__Host-tb_session',true)).toContain('Max-Age=0');
 });
 it('does not compare undefined or different-sized tokens, and uses hashes for exact matches',()=>{
  expect(safeEqual(undefined,'fake')).toBe(false);
  expect(safeEqual('a','ab')).toBe(false);
  expect(safeEqual('same','same')).toBe(true);
  expect(safeEqual('same','other')).toBe(false);
  expect(randomToken(8)).toMatch(/^[A-Za-z0-9_-]{11}$/);
  expect(sha256('abc')).toHaveLength(64);
  expect(hmac('synthetic-key','synthetic-value')).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(normalizeEmail('  SYNTHETIC@Example.INVALID ')).toBe('synthetic@example.invalid');
 });
 it('ignores spoofed forwarded headers when network peer is not trusted',()=>{
  const proxies=new BlockList();
  proxies.addAddress('10.0.0.1','ipv4');
  proxies.addAddress('10.0.0.2','ipv4');
  expect(resolveClientIp('203.0.113.8','198.51.100.1',proxies)).toBe('203.0.113.8');
  expect(resolveClientIp('10.0.0.1','198.51.100.1, 10.0.0.2',proxies)).toBe('198.51.100.1');
  expect(resolveClientIp('::ffff:10.0.0.1','198.51.100.2',proxies)).toBe('198.51.100.2');
  expect(resolveClientIp('10.0.0.1','bad-peer, 10.0.0.2',proxies)).toBe('10.0.0.2');
  expect(resolveClientIp('10.0.0.1',undefined,proxies)).toBe('10.0.0.1');
 });
 it('separates IPv4/IPv6 client prefixes and refuses invalid addresses',()=>{
  expect(ipPrefix('198.51.100.44')).toBe('198.51.100.0/24');
  expect(ipPrefix('2001:db8::1')).toBe('2001:db8:0::/48');
  expect(ipPrefix('not-an-ip')).toBe('unknown');
 });
});

describe('M4-08: password policy and verification fail-closed boundaries',()=>{
 it('rejects too short, too long, common and email-derived passwords',()=>{
  expect(passwordPolicyError('short','person@example.invalid')).toMatch(/at least 12/);
  expect(passwordPolicyError('X'.repeat(129),'person@example.invalid')).toMatch(/at most 128/);
  expect(passwordPolicyError('PersonIsInThisPassword123!','person@example.invalid')).toMatch(/email name/);
  expect(passwordPolicyError('much-longer-synthetic-secret-phrase','person@example.invalid')).toBe(null);
  expect(passwordPolicyError('much-longer-synthetic-secret-phrase','xx@example.invalid')).toBe(null);
 });
 it('treats invalid stored hashes as non-matches rather than throwing',async()=>{
  await expect(verifyPassword('not-an-argon2-hash','fictional')).resolves.toBe(false);
 });
});
