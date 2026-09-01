import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeHubEvents,
  filterCurrentEvents,
  filterCompletedEvents,
  isCashClimbHubEvent,
  hubFormatLabel,
} from './tournamentHubEvents.js';

describe('tournament hub events', () => {
  it('splits current and completed, preferring the tablet copy', () => {
    const events = mergeHubEvents({
      cashClimbSaved: [
        { id: 'cc-1', name: 'Friday Cash Climb', status: 'in-progress', type: 'cash-climb', updatedAt: '1' },
        { id: 'cc-2', name: 'Old Cash Climb', status: 'completed', type: 'cash-climb', updatedAt: '1' },
      ],
      elimSaved: [
        { id: 'el-1', name: 'Sunday Single', status: 'ended', type: 'single', updatedAt: '1' },
      ],
      localCashClimb: { id: 'cc-1', name: 'Friday Cash Climb (tablet)', status: 'in-progress', type: 'cash-climb' },
      localElim: { id: 'el-2', name: 'Live Double', status: 'in-progress', type: 'double' },
    });

    const current = filterCurrentEvents(events);
    const completed = filterCompletedEvents(events);

    assert.equal(current.find((item) => item.id === 'cc-1')?.name, 'Friday Cash Climb (tablet)');
    assert.equal(current.some((item) => item.id === 'el-2'), true);
    assert.equal(completed.map((item) => item.id).sort().join(','), 'cc-2,el-1');
    assert.equal(hubFormatLabel(current.find((item) => item.id === 'cc-1')), 'Cash Climb');
    assert.equal(isCashClimbHubEvent(current.find((item) => item.id === 'el-2')), false);
  });
});
