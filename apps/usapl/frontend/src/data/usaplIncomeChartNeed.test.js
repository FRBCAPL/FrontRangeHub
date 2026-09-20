import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { explainMissingIncomeChart } from './usaplIncomeChartNeed.js';

describe('explainMissingIncomeChart', () => {
  it('says team count is not the missing key', () => {
    const message = explainMissingIncomeChart({
      players: 4,
      duesCents: 1000,
      playType: 'single',
      saved: [{ dues_cents: 1000, play_type: 'single', players: 5 }],
    });
    assert.match(message, /Number of teams does not change the chart/);
    assert.match(message, /5-player/);
  });
});
