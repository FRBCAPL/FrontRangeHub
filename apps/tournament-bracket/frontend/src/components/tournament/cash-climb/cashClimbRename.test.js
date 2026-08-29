import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenTournament, startTournament, recordMatchResult, getCurrentRound, getRoundMatches } from './cashClimbEngine.js';
import { updateOpenTournament } from './cashClimbEdit.js';
import { parsePlayerName, renameCashClimbPlayers } from './cashClimbRename.js';

function startFour() {
  return startTournament(createOpenTournament({
    name: 'Friday Cash Climb',
    entryFee: 20,
    players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
  }));
}

describe('rename Cash Climb players', () => {
  it('rejects a blank name', () => {
    assert.throws(() => parsePlayerName('  '), /Enter a player name/);
  });

  it('updates the roster, standings, and match cards', () => {
    const started = startFour();
    const ann = started.players.find((p) => p.name === 'Ann');
    const next = renameCashClimbPlayers(started, [{ id: ann.id, name: ' Annie ' }]);
    assert.equal(next.players.find((p) => p.id === ann.id).name, 'Annie');
    assert.equal(next.stats.find((p) => p.player_id === ann.id).player_name, 'Annie');
    const named = next.matches.filter((m) => m.player1_id === ann.id || m.player2_id === ann.id);
    assert.ok(named.length > 0);
    named.forEach((match) => {
      if (match.player1_id === ann.id) assert.equal(match.player1_name, 'Annie');
      if (match.player2_id === ann.id) assert.equal(match.player2_name, 'Annie');
    });
    assert.equal(started.stats.find((p) => p.player_id === ann.id).player_name, 'Ann');
  });

  it('updates recorded match names without changing payouts', () => {
    let state = startFour();
    const match = getRoundMatches(state, getCurrentRound(state).id).find((m) => m.status === 'pending');
    state = recordMatchResult(state, match.id, match.player1_id, '5-3');
    const winnerId = match.player1_id;
    const paid = state.stats.find((p) => p.player_id === winnerId).total_payout;
    const pool = state.totalPrizePool;
    state = updateOpenTournament(state, {
      name: state.name,
      tournamentDate: state.tournamentDate,
      gameType: state.gameType,
      raceTo: state.raceTo,
      tableCount: state.tableCount,
      playerNames: [{ id: winnerId, name: 'Winner Name' }],
    });
    const recorded = state.matches.find((m) => m.id === match.id);
    assert.equal(recorded.winner_name, 'Winner Name');
    assert.equal(recorded.player1_name, 'Winner Name');
    assert.equal(state.stats.find((p) => p.player_id === winnerId).player_name, 'Winner Name');
    assert.equal(state.stats.find((p) => p.player_id === winnerId).total_payout, paid);
    assert.equal(state.totalPrizePool, pool);
  });

  it('updates a bye card and the champion line', () => {
    let state = startTournament(createOpenTournament({
      entryFee: 20,
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }],
    }));
    const bye = state.matches.find((m) => m.is_bye);
    assert.ok(bye);
    const sittingId = bye.player1_id;
    state.winner = { player_id: sittingId, player_name: bye.player1_name, total_payout: 40 };
    state = renameCashClimbPlayers(state, [{ id: sittingId, name: 'Casey' }]);
    const updated = state.matches.find((m) => m.id === bye.id);
    assert.equal(updated.player1_name, 'Casey');
    assert.equal(updated.winner_name, 'Casey');
    assert.equal(state.winner.player_name, 'Casey');
  });

  it('rejects an unknown player', () => {
    const state = startFour();
    assert.throws(
      () => renameCashClimbPlayers(state, [{ id: 'no-such-player', name: 'Ghost' }]),
      /Unknown player/
    );
  });
});
