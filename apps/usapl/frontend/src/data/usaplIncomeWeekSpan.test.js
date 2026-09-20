import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  usaplEndDateFromWeeks,
  usaplWeeksFromDates,
} from './usaplIncomeWeekSpan.js';

describe('usaplIncomeWeekSpan', () => {
  it('finds the last week from a start date and week count', () => {
    assert.equal(usaplEndDateFromWeeks('2026-09-16', 1), '2026-09-16');
    assert.equal(usaplEndDateFromWeeks('2026-09-16', 16), '2026-12-30');
  });

  it('counts inclusive weekly nights between two dates', () => {
    assert.equal(usaplWeeksFromDates('2026-09-16', '2026-09-16'), 1);
    assert.equal(usaplWeeksFromDates('2026-09-16', '2026-12-30'), 16);
    assert.equal(usaplWeeksFromDates('2026-09-16', '2026-09-15'), 0);
  });
});
