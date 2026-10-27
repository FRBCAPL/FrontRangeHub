import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './cashClimbV3RenderKit.test-support.mjs';
import { ccv3InitialStep, ccv3StepIssues, CCV3_SETUP_STEPS } from './cashClimbV3SetupSteps.js';
import { setupRecord } from '../cloud/cashClimbV3CloudTestKit.js';

const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
const setup = (over = {}) => ({
  name: 'Friday Cash Climb', tournamentDate: '2026-11-06', players: players(8),
  entryFeeCents: 2000, addedMoneyCents: 0, raceTo: 7, rules: { game: '', notes: '' }, ...over,
});

describe('Cash Climb (V3) guided setup steps', () => {
  it('has the four steps in order', () => {
    assert.deepEqual(CCV3_SETUP_STEPS.map((s) => s.key), ['event', 'money', 'players', 'review']);
  });

  it('reports nothing to fix for a complete setup', () => {
    assert.deepEqual(ccv3StepIssues(setup()), { event: [], money: [], players: [] });
  });

  it('puts each problem on the step that fixes it', () => {
    assert.deepEqual(ccv3StepIssues(setup({ name: ' ' })).event, ['Enter a tournament name.']);
    assert.deepEqual(ccv3StepIssues(setup({ tournamentDate: '' })).event, ['Pick the tournament date.']);
    assert.deepEqual(ccv3StepIssues(setup({ entryFeeCents: 500 })).money, ['The entry fee must be at least $10.']);
    assert.deepEqual(ccv3StepIssues(setup({ addedMoneyCents: NaN })).money, ['Added money cannot be negative.']);
    assert.deepEqual(ccv3StepIssues(setup({ raceTo: 0 })).money, ['The race length must be a whole number of racks, at least 1.']);
    assert.deepEqual(ccv3StepIssues(setup({ players: players(5) })).players, ['Add 3 more players (at least 8).']);
    assert.deepEqual(ccv3StepIssues(setup({ players: players(7) })).players, ['Add 1 more player (at least 8).']);
    const dup = [...players(8), { id: 'p9', name: 'player 1' }];
    assert.deepEqual(ccv3StepIssues(setup({ players: dup })).players, ['player 1 is entered more than once.']);
  });

  it('money issues never depend on the player count', () => {
    assert.deepEqual(ccv3StepIssues(setup({ players: [] })).money, []);
  });

  it('opens a new tournament at Event, and a saved one at Review (full field) or Players', () => {
    assert.equal(ccv3InitialStep(null), 'event');
    assert.equal(ccv3InitialStep(setupRecord('steps-1', 8)), 'review');
    assert.equal(ccv3InitialStep({ players: players(3) }), 'players');
  });
});

describe('Cash Climb (V3) guided setup screen', () => {
  it('a new tournament shows the step bar on Event, with the later steps hidden and nothing to save yet', async () => {
    const html = await render('./CashClimbV3Setup.jsx', { onCreate: () => {}, onCancel: () => {} });
    assert.match(html, /aria-label="Setup steps"/);
    ['Event', 'Money &amp; race', 'Players', 'Review &amp; save'].forEach((label) => assert.ok(html.includes(label), label));
    assert.match(html, /aria-current="step"[^>]*>.*?Event/);
    assert.match(html, /data-step="money" hidden/);
    assert.match(html, /data-step="review" hidden/);
    assert.match(html, /Next: Money &amp; race/);
    assert.match(html, /<button type="submit" class="btn-primary ccv3-save" disabled/);
    assert.match(html, /role="alert"><li>Add 8 more players \(at least 8\)\.<\/li><\/ul>/, 'review lists what is missing in plain words');
    assert.ok(!html.includes('Still to do in this step'), 'the Event step itself has nothing to fix');
  });

  it('editing a saved tournament opens at Review with its locked payouts, draw and an enabled save', async () => {
    const html = await render('./CashClimbV3Setup.jsx', { initial: setupRecord('steps-2', 8), onCreate: () => {}, onCancel: () => {} });
    assert.match(html, /Edit setup:/);
    assert.match(html, /data-step="event" hidden/);
    assert.ok(!/data-step="review" hidden/.test(html));
    assert.match(html, /Locked payouts/);
    assert.match(html, /Ready to save/);
    assert.ok(!/class="btn-primary ccv3-save" disabled/.test(html));
    assert.match(html, /Cancel editing/);
  });

  it('each player is a button to edit them, showing their details', async () => {
    const list = [{ id: 'p1', name: 'Alex', league: 'Front Range BCA', rank: 'B', fargorate: '550' }, { id: 'p2', name: 'Sam' }];
    const html = await render('./CashClimbV3PlayerList.jsx', { players: list, onEdit: () => {}, onRemove: () => {} });
    assert.match(html, /aria-label="Edit Alex"/);
    assert.match(html, /Front Range BCA · Rank B · Fargo 550/);
    assert.match(html, /aria-label="Remove Sam"/);
  });

  it('the edit dialog shows every detail, filled in', async () => {
    const player = { id: 'p1', name: 'Alex', email: 'alex@example.com', league: 'Front Range BCA', rank: 'B', fargorate: '550' };
    const html = await render('./CashClimbV3PlayerDialog.jsx', { player, others: [], onSave: () => {}, onRemove: () => {}, onClose: () => {} });
    ['value="Alex"', 'value="alex@example.com"', 'value="Front Range BCA"', 'value="B"', 'value="550"', 'Save changes', 'Remove player']
      .forEach((s) => assert.ok(html.includes(s), s));
  });
});

describe('Cash Climb (V3) saved player details', () => {
  it('keeps filled-in details, drops empty ones, and leaves name-only players unchanged', async () => {
    const { cleanCashClimbV3Player } = await import('./cashClimbV3Record.js');
    assert.deepEqual(cleanCashClimbV3Player({ id: ' p1 ', name: ' Alex ' }), { id: 'p1', name: 'Alex' });
    assert.deepEqual(
      cleanCashClimbV3Player({ id: 'p1', name: 'Alex', email: ' a@b.co ', league: '', rank: 'B', fargorate: 550, extra: 'x' }),
      { id: 'p1', name: 'Alex', email: 'a@b.co', rank: 'B', fargorate: '550' },
    );
  });
});
