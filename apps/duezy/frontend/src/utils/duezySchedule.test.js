import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  currentWeekOn,
  lateThroughOn,
  scheduleToSave,
  shortDate,
  todayISO,
  weekDates,
  weekdayOf,
} from './duezySchedule.js';

test('dates: add days across month and DST boundaries', () => {
  assert.equal(addDays('2026-10-27', 7), '2026-11-03');
  assert.equal(addDays('2026-03-03', 7), '2026-03-10');
  assert.equal(weekdayOf('2026-09-08'), 'Tuesday');
  assert.equal(shortDate('2026-09-08'), 'Sep 8');
});

test('weekDates: weekly from the first night, skipping holidays', () => {
  assert.equal(weekDates({ total_weeks: 3 }), null);
  assert.deepEqual(weekDates({ start_date: '2026-11-17', total_weeks: 4, skip_dates: ['2026-11-24'] }), [
    '2026-11-17', '2026-12-01', '2026-12-08', '2026-12-15',
  ]);
});

test('current week follows the calendar', () => {
  const dates = ['2026-09-08', '2026-09-15', '2026-09-22'];
  assert.equal(currentWeekOn(dates, '2026-09-01'), 1);
  assert.equal(currentWeekOn(dates, '2026-09-15'), 2);
  assert.equal(currentWeekOn(dates, '2026-09-20'), 2);
  assert.equal(currentWeekOn(dates, '2026-12-01'), 3);
});

test('late only after night + grace has passed', () => {
  const dates = ['2026-09-08', '2026-09-15', '2026-09-22'];
  assert.equal(lateThroughOn(dates, '2026-09-08', 0), 0);
  assert.equal(lateThroughOn(dates, '2026-09-09', 0), 1);
  assert.equal(lateThroughOn(dates, '2026-09-10', 3), 0);
  assert.equal(lateThroughOn(dates, '2026-09-12', 3), 1);
  assert.equal(lateThroughOn(dates, '2026-09-29', 7), 2);
  assert.equal(lateThroughOn(dates, '2026-09-30', 7), 3);
});

test('todayISO respects the league time zone', () => {
  const lateEveningDenver = new Date('2026-10-13T04:30:00Z');
  assert.equal(todayISO('America/Denver', lateEveningDenver), '2026-10-12');
  assert.equal(todayISO('UTC', lateEveningDenver), '2026-10-13');
  assert.match(todayISO('Not/AZone', lateEveningDenver), /^\d{4}-\d{2}-\d{2}$/);
});

test('scheduleToSave only sends keys the form has', () => {
  assert.deepEqual(scheduleToSave({ name: 'x' }), {});
  assert.deepEqual(scheduleToSave({ start_date: '', skip_dates: ['2026-11-26', 'junk', '2026-11-26'], grace_days: '' }), {
    start_date: null, skip_dates: ['2026-11-26'], grace_days: null,
  });
  assert.deepEqual(scheduleToSave({ start_date: '2026-09-08', grace_days: '3', timezone: 'America/Denver' }, { league: true }), {
    start_date: '2026-09-08', grace_days: 3, timezone: 'America/Denver',
  });
  assert.equal(scheduleToSave({ grace_days: '' }, { league: true }).grace_days, 0);
});
