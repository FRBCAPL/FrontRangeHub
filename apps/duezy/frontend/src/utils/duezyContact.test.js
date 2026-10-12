import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactLinks, parseContact } from './duezyContact.js';
import { teamReminder } from './duezyMath.js';

test('parseContact recognizes phones and emails', () => {
  assert.deepEqual(parseContact('(719) 555-0123'), { kind: 'phone', value: '(719) 555-0123', digits: '7195550123' });
  assert.deepEqual(parseContact(' bob@example.com '), { kind: 'email', value: 'bob@example.com' });
  assert.equal(parseContact('ask at the bar'), null);
  assert.equal(parseContact(''), null);
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
