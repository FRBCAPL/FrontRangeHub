import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactHint, contactLinks, formatContact, parseContact } from './duezyContact.js';
import { teamReminder } from './duezyMath.js';

test('parseContact recognizes phones and emails', () => {
  assert.deepEqual(parseContact('(719) 555-0123'), { kind: 'phone', value: '(719) 555-0123', digits: '7195550123' });
  assert.deepEqual(parseContact(' bob@example.com '), { kind: 'email', value: 'bob@example.com' });
  assert.equal(parseContact('ask at the bar'), null);
  assert.equal(parseContact(''), null);
});

test('formatContact tidies US phone numbers only', () => {
  assert.equal(formatContact('7195550123'), '719-555-0123');
  assert.equal(formatContact(' (719) 555 0123 '), '719-555-0123');
  assert.equal(formatContact('+1 719.555.0123'), '719-555-0123');
  assert.equal(formatContact('+44 20 7946 0958'), '+44 20 7946 0958');
  assert.equal(formatContact('555-0123'), '555-0123');
  assert.equal(formatContact(' bob@example.com '), 'bob@example.com');
  assert.equal(formatContact('ask at the bar'), 'ask at the bar');
});

test('contactHint says what the contact will do', () => {
  assert.equal(contactHint('').tone, 'muted');
  assert.equal(contactHint('719-555-0123').tone, 'ok');
  assert.match(contactHint('a@b.co').text, /Email/);
  assert.equal(contactHint('call Bob').tone, 'warn');
});

test('contactLinks builds call/text or email links', () => {
  assert.deepEqual(contactLinks('719-555-0123'), { call: 'tel:7195550123', text: 'sms:7195550123' });
  assert.equal(contactLinks('719-555-0123', 'Hi there').text, 'sms:7195550123?&body=Hi%20there');
  assert.equal(contactLinks('a@b.co').email, 'mailto:a@b.co');
  assert.deepEqual(contactLinks('nope'), {});
});

test('teamReminder is personal and includes payment note', () => {
  const league = { name: 'Tuesday 8-Ball', payment_note: 'Venmo @frpl' };
  const team = { name: 'Sharks', captain: 'Bobby King' };
  assert.equal(
    teamReminder(league, team, 30, 'Sep 16, Sep 23'),
    'Hi Bobby — quick Tuesday 8-Ball dues reminder: Sharks owes $30 for Sep 16, Sep 23. Venmo @frpl Thanks!',
  );
  assert.equal(teamReminder({ name: 'L' }, { name: 'X' }, 5), 'Hi — quick L dues reminder: X owes $5. Thanks!');
});

test('teamReminder adds tap-to-pay links and the sign-off', () => {
  const league = { name: 'L', pay_handles: { venmo: 'sam' }, reminder_signoff: '— Sam' };
  assert.equal(
    teamReminder(league, { name: 'X' }, 5),
    'Hi — quick L dues reminder: X owes $5. Venmo: https://venmo.com/u/sam Thanks! — Sam',
  );
});
