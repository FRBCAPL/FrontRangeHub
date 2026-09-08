import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeUsaplVisits } from './usaplVisitStats.js';

describe('summarizeUsaplVisits', () => {
  it('splits this-browser views from other visitors', () => {
    const rows = [
      { id: '1', visitor_id: 'me', path: '/usapl', created_at: new Date().toISOString() },
      { id: '2', visitor_id: 'me', path: '/usapl/info', created_at: new Date().toISOString() },
      { id: '3', visitor_id: 'other', path: '/usapl', created_at: new Date().toISOString() },
    ];
    const stats = summarizeUsaplVisits(rows, [], (row) => row.path, 'me');
    assert.equal(stats.mineViews, 2);
    assert.equal(stats.views, 1);
    assert.equal(stats.visitors, 1);
    assert.equal(stats.recent.filter((row) => row.isMine).length, 2);
  });
});
