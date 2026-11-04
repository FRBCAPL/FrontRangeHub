import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCHEDULE, scheduleText, schedulerMissing, timeText, zoneText } from '../src/utils/itemsurePosSchedule.js';

test('times read the way people say them', () => {
  assert.equal(timeText('23:00'), '11:00 PM');
  assert.equal(timeText('00:05'), '12:05 AM');
  assert.equal(timeText('12:30'), '12:30 PM');
  assert.equal(timeText('06:30'), '6:30 AM');
  assert.equal(timeText(''), '');
});

test('the schedule in one sentence; the default is Sunday 11 PM weekly', () => {
  assert.equal(scheduleText(DEFAULT_SCHEDULE), 'Every Sunday at 11:00 PM');
  assert.equal(scheduleText({ frequency: 'weekly', weekday: 5, time: '02:15' }), 'Every Friday at 2:15 AM');
  assert.equal(scheduleText({ frequency: 'daily', weekday: 3, time: '06:00' }), 'Every day at 6:00 AM');
});

test('time zones read as plain names', () => {
  assert.equal(zoneText('America/Denver'), 'Mountain Time');
  assert.equal(zoneText('Not/AZone'), 'Not/AZone');
  assert.equal(zoneText(''), '');
});

test('warns only when it is on and no scheduler is checking in', () => {
  assert.equal(schedulerMissing({ on: true, scheduler_active: false }), true);
  assert.equal(schedulerMissing({ on: true, scheduler_active: true }), false);
  assert.equal(schedulerMissing({ on: false, scheduler_active: false }), false);
  assert.equal(schedulerMissing(null), false);
});
