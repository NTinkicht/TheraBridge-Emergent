// Run only locally. Secrets are never printed, overwritten, or committed.
// The original seven and the three extra therapist identities have INDEPENDENT
// outputs; a seven-account file must not prevent extra-file generation.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const groups = [
  {
    file: 'render-demo-passwords.json',
    emails: [
      'platform.demo@childrens-home.therabridge.test',
      'admin@childrens-home.therabridge.test',
      'coordinator@childrens-home.therabridge.test',
      'speech@childrens-home.therabridge.test',
      'ot@childrens-home.therabridge.test',
      'supervisor@childrens-home.therabridge.test',
      'mariam.ahmed@childrens-home.therabridge.test',
    ],
  },
  {
    file: 'render-demo-extra-passwords.json',
    emails: [
      'dalia.mansour@childrens-home.therabridge.test',
      'nour.haddad@childrens-home.therabridge.test',
      'huda.rahim@childrens-home.therabridge.test',
    ],
  },
];

const directory = join(process.cwd(), '.workspace/local-credentials');
mkdirSync(directory, { recursive: true, mode: 0o700 });
for (const { file, emails } of groups) {
  const destination = join(directory, file);
  if (existsSync(destination)) {
    console.log('Preserved existing protected credential file: ' + file);
    continue;
  }
  const passwords = Object.fromEntries(emails.map(email => [
    email, 'demo-' + randomBytes(24).toString('base64url'),
  ]));
  // Exclusive creation remains authoritative even after a competing race.
  writeFileSync(destination, JSON.stringify(passwords, null, 2) + '\n', {
    encoding: 'utf8', flag: 'wx', mode: 0o600,
  });
  console.log('Created protected fictional credential file: ' + file);
}
console.log('Never commit, print, paste or publicly share generated demo credentials.');
