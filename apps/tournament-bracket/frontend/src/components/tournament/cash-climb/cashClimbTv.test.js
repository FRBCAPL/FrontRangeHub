import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenTournament, startTournament, recordMatchResult, getCurrentRound, getRoundMatches } from './cashClimbEngine.js';
import { buildCashClimbTvBoard, matchGridColumns, matchResultLine, parseTvLayout, cashClimbTvHref, tickerCopy, tickerResultLines, tickerRoundLabel } from './cashClimbTv.js';

describe('Cash Climb TV board', () => {
  it('lists live matches and standings from the running event', () => {
    const setup = createOpenTournament({
      name: 'TV Night',
      raceTo: 3,
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    });
    const state = startTournament(setup);
    const board = buildCashClimbTvBoard(state);
    assert.equal(board.name, 'TV Night');
    assert.ok(board.live.length >= 1);
    assert.equal(board.byes.length, 0);
    assert.equal(board.standings.length, 4);
    assert.equal(board.kohStarted, false);
    assert.equal(parseTvLayout('9x16'), 'portrait');
    assert.equal(parseTvLayout('portrait'), 'portrait');
    assert.equal(parseTvLayout('landscape'), 'landscape');
    assert.match(cashClimbTvHref('portrait'), /layout=portrait/);
    assert.equal(matchGridColumns('landscape', 1), 1);
    assert.equal(matchGridColumns('landscape', 2), 2);
    assert.equal(matchGridColumns('landscape', 4), 4);
    assert.equal(matchGridColumns('landscape', 7), 4);
    assert.equal(matchGridColumns('portrait', 1), 2);
    assert.equal(matchGridColumns('portrait', 2), 2);
    assert.deepEqual(
      tickerResultLines([
        { status: 'completed', is_bye: true, winner_name: 'Ann', completed_at: '1' },
        { status: 'completed', is_bye: false, winner_name: 'Ben', loser_name: 'Cam', score: '3-1', completed_at: '2' },
        { status: 'pending', winner_name: 'Dee' },
      ]),
      ['Ben vs Cam 3-1', 'Ann — bye']
    );
    assert.equal(tickerCopy(['Ann — bye']), 'Ann — bye');
    assert.equal(tickerCopy(['Ben vs Cam 3-1', 'Ann — bye']), 'Ben vs Cam 3-1    •    Ann — bye');
    assert.equal(
      tickerRoundLabel({ round_id: 'r1', round_number: 1 }, [{ id: 'r1', round_number: 1, round_name: 'Round 1 (8-Ball)' }]),
      'Round 1'
    );
    assert.equal(
      tickerRoundLabel({ round_id: 'k1' }, [{ id: 'k1', round_name: 'King of the Hill', koh_round_number: 2 }]),
      'KOH 2'
    );
    assert.deepEqual(
      tickerResultLines(
        [{ status: 'completed', is_bye: false, winner_name: 'Ben', loser_name: 'Cam', score: '3-1', round_id: 'r1', completed_at: '2' }],
        [{ id: 'r1', round_number: 1, round_name: 'Round 1 (8-Ball)' }]
      ),
      ['Round 1  Ben vs Cam 3-1']
    );
    assert.deepEqual(
      tickerResultLines(
        [
          { status: 'completed', is_bye: false, winner_name: 'Dee', loser_name: 'Fay', score: '3-0', round_id: 'r2', completed_at: '4' },
          { status: 'completed', is_bye: false, winner_name: 'Ben', loser_name: 'Cam', score: '3-1', round_id: 'r1', completed_at: '2' },
          { status: 'completed', is_bye: true, winner_name: 'Ann', round_id: 'r1', completed_at: '1' },
        ],
        [
          { id: 'r1', round_number: 1, round_name: 'Round 1 (8-Ball)' },
          { id: 'r2', round_number: 2, round_name: 'Round 2 (9-Ball)' },
        ]
      ),
      ['Round 1  Ben vs Cam 3-1', 'Ann — bye', 'Round 2  Dee vs Fay 3-0']
    );
  });

  it('formats a completed match line with score', () => {
    assert.equal(
      matchResultLine({
        is_bye: false,
        winner_name: 'Ann',
        loser_name: 'Ben',
        score: '3-1',
      }),
      'Ann def. Ben 3-1'
    );
  });

  it('caps live TV matches to the table count', () => {
    const names = ['Ann', 'Ben', 'Cam', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jen'];
    const state = startTournament(createOpenTournament({
      tableCount: 4,
      players: names.map((name) => ({ name })),
    }));
    const board = buildCashClimbTvBoard(state);
    assert.ok(board.live.length + (board.onDeck || []).length >= 5);
    assert.equal(board.live.length, 4);
    assert.equal(board.live[0].tableNumber, 1);
    assert.equal(board.live[3].tableNumber, 4);
    assert.ok((board.onDeck || []).length >= 1);
  });

  it('includes a current-round bye card when the field is odd', () => {
    const state = startTournament(createOpenTournament({
      name: 'Odd Night',
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }, { name: 'Eve' }],
    }));
    const board = buildCashClimbTvBoard(state);
    assert.equal(board.byes.length, 1);
    assert.ok(board.byes[0].winner_name || board.byes[0].player1_name);
  });

  it('marks King of the Hill once that round exists', () => {
    let state = startTournament(createOpenTournament({
      players: [{ name: 'Ann' }, { name: 'Ben' }],
    }));
    const first = getRoundMatches(state, getCurrentRound(state).id).find((m) => m.status === 'pending');
    state = recordMatchResult(state, first.id, first.player1_id);
    const board = buildCashClimbTvBoard(state);
    assert.equal(board.kohStarted, true);
    assert.ok(board.roundName.includes('King of the Hill'));
  });
});
