// M4-08 bootstrap owner hardening: test the real operator precondition guard.
// No Prisma operations or interactive prompts are invoked. Synthetic data only.
import { bootstrapPreconditionError } from '../src/cli/bootstrap-owner';

const valid = () => ({
  DEPLOYMENT_ENV: 'staging',
  BOOTSTRAP_OWNER_ALLOWED: 'true',
});
const args = ['--email', 'fictional.owner@example.invalid'];

describe('first platform owner bootstrap refuses insecure input sources', () => {
  it.each([undefined, '', 'development', 'test', 'Production'])(
    'refuses unsupported deployment value %s before any further action',
    deployment => {
      const message = bootstrapPreconditionError({...valid(), DEPLOYMENT_ENV:deployment}, args, true);
      expect(message).toContain('refuses to run');
      expect(message).toContain('DEPLOYMENT_ENV=');
    },
  );
  it.each(['local', 'staging', 'production'])('accepts operator-enabled %s as a deployment only with all other gates', deployment => {
    expect(bootstrapPreconditionError({...valid(), DEPLOYMENT_ENV:deployment}, args, true)).toBeNull();
  });
  it('refuses absent, misspelled and non-true operator authorization', () => {
    for(const allowed of [undefined, '', 'TRUE', 'false', '1']){
      expect(bootstrapPreconditionError({...valid(), BOOTSTRAP_OWNER_ALLOWED:allowed}, args, true))
        .toContain('BOOTSTRAP_OWNER_ALLOWED=true');
    }
  });
  it('rejects password command line arguments before attempting terminal access', () => {
    for(const item of ['--password', '--password=fictional', '--password-file']){
      expect(bootstrapPreconditionError(valid(), [...args,item], true))
        .toContain('Passwords are never accepted as arguments');
    }
  });
  it.each(['BOOTSTRAP_PASSWORD', 'OWNER_PASSWORD', 'BOOTSTRAP_OWNER_PASSWORD'])(
    'rejects secret-bearing %s environment variable even when empty', variable => {
      expect(bootstrapPreconditionError({...valid(), [variable]:''}, args, true))
        .toContain('Passwords are never accepted from environment variables');
    },
  );
  it('requires a real TTY before handling email data', () => {
    expect(bootstrapPreconditionError(valid(), args, false))
      .toContain('interactive terminal');
  });
  it.each(([
    [], ['--email'], ['--email',''], ['--email','not-an-email'],
    ['--email','a@b'], ['--email','a@@example.invalid'],
    ['--email','a b@example.invalid'],
  ] as string[][]).map(values => [values]))('refuses malformed or absent address flags %j', invalid => {
    expect(bootstrapPreconditionError(valid(), invalid, true))
      .toContain('Usage: bootstrap:owner --email');
  });
  it('accepts a syntactically valid flagged address without accepting a password', () => {
    expect(bootstrapPreconditionError(valid(), ['--email','operator+synthetic@example.invalid'], true)).toBeNull();
  });
});
