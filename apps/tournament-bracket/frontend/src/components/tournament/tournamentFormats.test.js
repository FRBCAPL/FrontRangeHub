import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CASH_CLIMB_FORMATS, cashClimbFormat, cashClimbFormatLabel, cashClimbFormatOf } from './tournamentFormats.js';
import { mergeHubEvents, filterCurrentEvents, hubFormatLabel, hubEventDetailLine, isCashClimbHubEvent, isCashClimbV3HubEvent, isShowdownHubEvent } from './tournamentHubEvents.js';
import { SHOWDOWN_TYPE } from './showdown/showdownRules.js';
import { CASH_CLIMB_V3_FORMAT } from './cash-climb-v3/cashClimbV3Config.js';

describe('Cash Climb format registry', () => {
  it('keeps three distinct stable ids with unambiguous names', () => {
    assert.deepEqual(CASH_CLIMB_FORMATS.map((f) => [f.id, f.recordType, f.label]), [
      ['cash-climb-v3', 'cash-climb-v3', 'Cash Climb'],
      ['cash-climb', 'cash-climb', 'Cash Climb: King of the Hill'],
      ['showdown', 'cash-climb-showdown', 'Cash Climb: Showdown'],
    ]);
    assert.equal(cashClimbFormat('cash-climb-v3').recordType, CASH_CLIMB_V3_FORMAT);
    assert.equal(cashClimbFormat('showdown').recordType, SHOWDOWN_TYPE);
    assert.equal(cashClimbFormatLabel('nope'), '');
    assert.equal(new Set(CASH_CLIMB_FORMATS.map((f) => f.label)).size, 3);
  });

  it('identifies saved records and hub items by their own ids only', () => {
    assert.equal(cashClimbFormatOf({ type: 'cash-climb' }).id, 'cash-climb');
    assert.equal(cashClimbFormatOf({ type: 'cash-climb-showdown' }).id, 'showdown');
    assert.equal(cashClimbFormatOf({ kind: 'showdown' }).id, 'showdown');
    assert.equal(cashClimbFormatOf({ type: 'cash-climb-v3' }).id, 'cash-climb-v3');
    assert.equal(cashClimbFormatOf({ type: 'single' }), null);
    assert.equal(cashClimbFormatOf(null), null);
  });
});

describe('Tournament hub with all three Cash Climb formats', () => {
  const events = mergeHubEvents({
    cashClimbSaved: [{ id: 'cc-1', name: 'Friday', status: 'in-progress', type: 'cash-climb', updatedAt: '1' }],
    showdownSaved: [{ id: 'sd-1', name: 'Friday', status: 'qualifying', type: SHOWDOWN_TYPE, kind: 'showdown', updatedAt: '1' }],
    cashClimbV3Saved: [{ id: 'ccv3-1', name: 'Friday', status: 'setup', type: 'cash-climb-v3', kind: 'cash-climb-v3', tournamentDate: '2026-10-30', prizePoolCents: 48000, updatedAt: '1' }],
  });
  const byId = (id) => events.find((e) => e.id === id);

  it('labels and routes each format separately, even with identical names', () => {
    assert.equal(hubFormatLabel(byId('cc-1')), 'Cash Climb: King of the Hill');
    assert.equal(hubFormatLabel(byId('sd-1')), 'Cash Climb: Showdown');
    assert.equal(hubFormatLabel(byId('ccv3-1')), 'Cash Climb');
    assert.deepEqual([isCashClimbV3HubEvent(byId('cc-1')), isCashClimbV3HubEvent(byId('sd-1')), isCashClimbV3HubEvent(byId('ccv3-1'))], [false, false, true]);
    assert.deepEqual([isCashClimbHubEvent(byId('ccv3-1')), isShowdownHubEvent(byId('ccv3-1'))], [false, false]);
    assert.equal(byId('cc-1').kind, 'cash-climb');
  });

  it('lists an unstarted Cash Climb event as current with its status and prize pool', () => {
    assert.ok(filterCurrentEvents(events).some((e) => e.id === 'ccv3-1'));
    assert.match(hubEventDetailLine(byId('ccv3-1')), /^Cash Climb • Setup • .* • Prize \$480/);
  });

  it('adding the Cash Climb list leaves the other formats exactly as before', () => {
    const base = {
      cashClimbSaved: [{ id: 'cc-1', name: 'Friday', status: 'in-progress', type: 'cash-climb', updatedAt: '1' }],
      elimSaved: [{ id: 'el-1', name: 'Elim', status: 'completed', type: 'single', updatedAt: '1' }],
    };
    assert.deepEqual(mergeHubEvents({ ...base, cashClimbV3Saved: [] }), mergeHubEvents(base));
  });
});
