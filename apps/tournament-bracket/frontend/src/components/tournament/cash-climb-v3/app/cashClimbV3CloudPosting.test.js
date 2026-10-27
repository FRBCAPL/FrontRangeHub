import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './cashClimbV3RenderKit.test-support.mjs';
import { freshPostCheck, REFRESHED_MESSAGE, CONFLICT_MESSAGE, INVALID_MESSAGE } from './cashClimbV3FreshPost.js';
import { firstUploadSummary } from './cashClimbV3FirstUpload.js';
import { cashClimbV3SyncLabel, cashClimbV3HubSyncLabel } from '../cloud/cashClimbV3SyncLabels.js';
import { firstReady, post, setupRecord, startedRecord } from '../cloud/cashClimbV3CloudTestKit.js';

describe('Cash Climb (V3) fresh check before posting', () => {
  it('posts only when the tablet copy is current; otherwise says why and asks for a new review', async () => {
    assert.equal(await freshPostCheck(async () => ({ state: 'current' })), null);
    assert.equal(await freshPostCheck(async () => ({ state: 'current', offline: true })), null, 'offline stays local-first');
    assert.equal(await freshPostCheck(async () => { throw new Error('boom'); }), null, 'a failing check never blocks local scoring');
    assert.deepEqual(await freshPostCheck(async () => ({ state: 'refreshed' })), { status: 'invalid', refreshed: true, problems: [REFRESHED_MESSAGE] });
    assert.deepEqual(await freshPostCheck(async () => ({ state: 'conflict' })), { status: 'invalid', problems: [CONFLICT_MESSAGE] });
    assert.deepEqual(await freshPostCheck(async () => ({ state: 'invalid' })), { status: 'invalid', problems: [INVALID_MESSAGE] });
  });

  it('the result dialog posts nothing for a match that already has a result from another device', async () => {
    const s = startedRecord('fp-1', 8);
    const m = firstReady(s);
    const decided = post(s, m);
    const html = await render('./CashClimbV3ResultDialog.jsx', { record: decided, matchId: m, onPost: () => ({ status: 'ok' }), onClose: () => {} });
    assert.match(html, /already has a result from another device/);
    assert.ok(!html.includes('Confirm and post result') && !html.includes('Review result'));
    const open = await render('./CashClimbV3ResultDialog.jsx', { record: s, matchId: m, onPost: () => ({ status: 'ok' }), onClose: () => {} });
    assert.match(open, /Review result/);
  });
});

describe('Cash Climb (V3) first-upload review', () => {
  it('summarizes what will be sent', () => {
    const s = post(startedRecord('fu-1', 8), firstReady(startedRecord('fu-1', 8)));
    const sum = firstUploadSummary(s);
    assert.equal(sum.name, s.name);
    assert.equal(sum.entrants.length, 8);
    assert.equal(sum.status, 'in-progress');
    assert.equal(sum.resultsPosted, 1);
    assert.equal(sum.settled, false);
    assert.ok(sum.earnedCents > 0);
    assert.equal(sum.prizePoolCents, s.payout.prizePoolCents);
    assert.equal(sum.optimizerId, s.payout.optimizerId);
    assert.equal(sum.payoutLocked, true);
    assert.equal(firstUploadSummary(setupRecord('fu-2')).payoutLocked, false);
  });

  it('shows the destination and every required detail, and cannot be approved until reviewed', async () => {
    const s = startedRecord('fu-3', 8);
    const html = await render('./CashClimbV3FirstUploadDialog.jsx', { record: s, mode: 'live', onApprove: async () => {}, onClose: () => {} });
    assert.match(html, /Production cloud \(the live Front Range Pool database\)/);
    ['Tournament', 'Date', 'Status', 'Results posted', 'Settlement', 'Prize pool', 'Payout', 'Entrants (8)'].forEach((label) => assert.ok(html.includes(label), label));
    s.players.forEach((p) => assert.ok(html.includes(p.name), p.name));
    assert.match(html, /<button[^>]*disabled=""[^>]*>Approve and upload/);
    const iso = await render('./CashClimbV3FirstUploadDialog.jsx', { record: s, mode: 'isolated', onApprove: async () => {}, onClose: () => {} });
    assert.match(iso, /Isolated test cloud \(this browser only\)/);
  });

  it('labels a tournament waiting for review in the banner and the hub', async () => {
    assert.equal(cashClimbV3SyncLabel('needs-approval'), 'Not uploaded \u2014 review needed');
    assert.equal(cashClimbV3HubSyncLabel({ state: 'needs-approval', revision: 0, dirty: true }), 'Not uploaded \u2014 review needed');
    const html = await render('./CashClimbV3SyncBanner.jsx', { status: { state: 'needs-approval', message: '' }, mode: 'live' });
    assert.match(html, /Review and upload/);
    assert.match(html, /not sent until you review it/);
  });
});
