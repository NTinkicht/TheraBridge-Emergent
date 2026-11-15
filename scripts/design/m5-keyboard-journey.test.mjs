import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYBOARD_EXPECTED, validateKeyboardJourneys } from './m5-keyboard-journey.mjs';

const ids = ['platform-admin','center-admin','coordinator','speech-therapist','ot-therapist','supervisor','guardian'];
const fixture = () => ids.map(persona => ({ persona, desktopHomeViaEnter: 'OBSERVED',
  mobileSelectFocus: 'OBSERVED', mobileShiftTabToSignOut: 'NOT_OBSERVED',
  signOutViaEnter: 'OBSERVED', desktopNavigationMs: 102 }));

test('requires a bounded measured keyboard path for all seven distinct synthetic personas', () => {
  assert.equal(KEYBOARD_EXPECTED, 7);
  assert.equal(validateKeyboardJourneys(fixture()), true);
  const shorter = fixture(); shorter.pop();
  assert.throws(() => validateKeyboardJourneys(shorter), /exactly seven/);
  const duplicate = fixture(); duplicate[0].persona = 'guardian';
  assert.throws(() => validateKeyboardJourneys(duplicate), /Duplicate/);
});

test('does not confuse a keyboard focus observation with human accessibility approval', () => {
  for (const patch of [
    { desktopHomeViaEnter: 'PASS' },
    { mobileSelectFocus: 'NOT_TESTED' },
    { signOutViaEnter: 'BLOCKED' },
    { desktopNavigationMs: -1 },
    { desktopNavigationMs: Number.NaN },
    { desktopNavigationMs: 30001 },
    { password: 'never archive this' },
    { html: '<main>private narrative</main>' },
  ]) {
    const x = fixture(); Object.assign(x[0], patch);
    assert.throws(() => validateKeyboardJourneys(x), /incomplete|unsafe|certified/);
  }
});

test('non-adjacent focus movement may be recorded without false pass', () => {
  const x = fixture();
  x[0].mobileShiftTabToSignOut = 'OBSERVED';
  assert.equal(validateKeyboardJourneys(x), true);
  x[0].mobileShiftTabToSignOut = 'PASS';
  assert.throws(() => validateKeyboardJourneys(x), /incomplete/);
});
