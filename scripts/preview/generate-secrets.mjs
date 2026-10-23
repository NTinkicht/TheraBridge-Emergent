// Run only locally: never print passwords or commit the resulting file.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const emails=[
  'platform.demo@childrens-home.therabridge.test',
  'admin@childrens-home.therabridge.test',
  'coordinator@childrens-home.therabridge.test',
  'speech@childrens-home.therabridge.test',
  'ot@childrens-home.therabridge.test',
  'supervisor@childrens-home.therabridge.test',
  'mariam.ahmed@childrens-home.therabridge.test'
];
const directory=join(process.cwd(),'.workspace/local-credentials');
mkdirSync(directory,{recursive:true,mode:0o700});
const file=join(directory,'render-demo-passwords.json');
const passwords=Object.fromEntries(emails.map(email=>[email,'demo-'+randomBytes(24).toString('base64url')]));
writeFileSync(file,JSON.stringify(passwords,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
console.log('Protected fictional demo credentials created under .workspace/local-credentials/render-demo-passwords.json; never commit or post them.');
