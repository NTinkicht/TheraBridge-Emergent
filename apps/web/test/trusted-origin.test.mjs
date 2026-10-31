import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedOrigin } from '../src/lib/trusted-origin.mjs';

test('trusted upstream origin permits fixed internal origins', () => {
  assert.equal(trustedOrigin('http://api:8001'), 'http://api:8001');
  assert.equal(trustedOrigin('http://127.0.0.1:8001'), 'http://127.0.0.1:8001');
  assert.equal(trustedOrigin('https://api.example.org'), 'https://api.example.org');
});
test('rejects public-request style paths, userinfo, and unsafe schemes', () => {
  for (const input of ['javascript:alert(1)', 'file:///etc/passwd', 'http://api:8001/secret',
    'http://user:pass@api:8001', 'https://api.example.org?next=x',
    'https://api.example.org/#fragment', 'not-a-url']) {
    assert.throws(() => trustedOrigin(input), undefined, input);
  }
});
