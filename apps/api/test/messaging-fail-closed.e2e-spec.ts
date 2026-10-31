import { can, permissionsFor, syntheticMessagesTestFixtureOnly } from '../src/auth/policy';

// D-NEW-5: environment flags are never a substitute for an approved
// safeguarding lead, escalation route, custody policy and consent decisions.
describe('M2-S01 fail-closed family messaging policy', () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
    FAMILY_MESSAGING_DEMO: process.env.FAMILY_MESSAGING_DEMO,
    JEST_WORKER_ID: process.env.JEST_WORKER_ID,
  };
  afterEach(() => {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('denies all deployment environments even when the demo flag is true', () => {
    process.env.NODE_ENV = 'test';
    process.env.FAMILY_MESSAGING_DEMO = 'true';
    process.env.JEST_WORKER_ID = '1';
    for (const environment of ['local', 'development', 'preview', 'staging', 'production']) {
      process.env.DEPLOYMENT_ENV = environment;
      expect(syntheticMessagesTestFixtureOnly()).toBe(false);
      for (const role of ['GUARDIAN', 'THERAPIST', 'CENTER_ADMIN', 'COORDINATOR'] as const) {
        expect(can(role, 'center.messages.use')).toBe(false);
        expect(permissionsFor(role)).not.toContain('center.messages.use');
      }
    }
  });

  it('requires all isolated Jest/CI fixture signals, not one opt-in variable', () => {
    process.env.NODE_ENV = 'test';
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.FAMILY_MESSAGING_DEMO = 'true';
    process.env.JEST_WORKER_ID = '1';
    expect(syntheticMessagesTestFixtureOnly()).toBe(true);
    expect(can('GUARDIAN', 'center.messages.use')).toBe(true);
    expect(can('CENTER_ADMIN', 'center.messages.manage')).toBe(true);

    delete process.env.JEST_WORKER_ID;
    expect(syntheticMessagesTestFixtureOnly()).toBe(false);
    process.env.JEST_WORKER_ID = '1';
    process.env.FAMILY_MESSAGING_DEMO = 'false';
    expect(syntheticMessagesTestFixtureOnly()).toBe(false);
    process.env.FAMILY_MESSAGING_DEMO = 'true';
    process.env.NODE_ENV = 'production';
    expect(syntheticMessagesTestFixtureOnly()).toBe(false);
    expect(can('GUARDIAN', 'center.messages.use')).toBe(false);
    expect(can('THERAPIST', 'center.messages.manage')).toBe(false);
  });
});
