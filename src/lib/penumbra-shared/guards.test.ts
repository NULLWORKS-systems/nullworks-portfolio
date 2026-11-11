import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizedEmail, allowedEmail, isUuid, messageText, roomTitle, inviteTokenValid, displayLabel, originAllowed } from './guards.ts';

test('identity whitelist is explicit and normalized', () => {
  assert.equal(allowedEmail(' JASON@example.test ', 'mason@example.test, jason@example.test'), true);
  assert.equal(allowedEmail('stranger@example.test',''), false);
  assert.equal(allowedEmail('stranger@example.test','mason@example.test,jason@example.test'), false);
  assert.equal(normalizedEmail(' X@EXAMPLE.TEST '), 'x@example.test');
});
test('events require UUID client IDs and bounded human text', () => {
  assert.equal(isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479'),true);
  assert.equal(isUuid('../../../etc/passwd'), false);
  assert.equal(messageText('  Hi!  '), 'Hi!');
  assert.equal(messageText(' '), null);
  assert.equal(messageText('x'.repeat(4001)), null);
  assert.equal(roomTitle('  Jason Room  '), 'Jason Room');
  assert.equal(roomTitle(''), null);
});
test('invitations require full entropy token shape', () => {
  assert.equal(inviteTokenValid('f'.repeat(64)), true);
  assert.equal(inviteTokenValid('f'.repeat(32)), false);
  assert.equal(inviteTokenValid('../'+'f'.repeat(64)), false);
});
test('labels do not grant identity or authority', () => {
  assert.equal(displayLabel('mason@example.test','mason@example.test','jason@example.test'), 'Mason');
  assert.equal(displayLabel('jason@example.test','mason@example.test','jason@example.test'), 'Jason');
  assert.equal(displayLabel('unknown@example.test','mason@example.test','jason@example.test'), 'unknown');
});
test('cross-site writes rejected', () => {
  assert.equal(originAllowed('https://room.test','https://room.test'), true);
  assert.equal(originAllowed('https://evilroom.test','https://room.test'), false);
  assert.equal(originAllowed(null,'https://room.test'), false);
});
