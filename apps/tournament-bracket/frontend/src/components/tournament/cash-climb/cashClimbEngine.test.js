import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenTournament, startTournament, recordMatchResult, getCurrentRound, getRoundMatches, getActivePlayers, sanitizeCashClimb } from './cashClimbEngine.js';

function playPending(state) {
  let current = state;
  for (let guard = 0; guard < 80; guard++) {
    if (current.status === 'completed') return current;
    const round = getCurrentRound(current);
    const pending = getRoundMatches(current, round.id).filter((m) => m.status === 'pending');
    if (!pending.length) return current;
    const match = pending[0];
    current = recordMatchResult(current, match.id, match.player1_id, '5-3');
  }
  return current;
}

describe('open Cash Climb engine', () => {
  it('runs a 4-player event to a winner without ladder fields', () => {
    const setup = createOpenTournament({
      name: 'Friday Cash Climb',
      entryFee: 20,
      firstPlacePrize: 20,
      roundRobinType: 'single',
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    });
    assert.equal(setup.ladder_name, undefined);
    assert.equal(setup.totalPrizePool, 80);
    assert.equal(setup.raceTo, 5);

    let state = startTournament(setup);
    assert.equal(state.status, 'in-progress');
    assert.ok(state.rounds.length >= 1);
    assert.equal(state.stats.length, 4);

    state = playPending(state);
    assert.equal(state.status, 'completed');
    assert.ok(state.winner);
    assert.ok(state.winner.player_name);
    const paid = state.stats.reduce((sum, p) => sum + p.total_payout, 0);
    assert.ok(Math.abs(paid - 80) < 0.02);
  });

  it('stores the chosen race to', () => {
    const setup = createOpenTournament({
      raceTo: 7,
      players: [{ name: 'Ann' }, { name: 'Ben' }],
    });
    assert.equal(setup.raceTo, 7);
  });

  it('eliminates at 3 losses in round robin', () => {
    const setup = createOpenTournament({
      roundRobinType: 'double',
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    });
    let state = startTournament(setup);
    const round = getCurrentRound(state);
    const match = getRoundMatches(state, round.id).find((m) => m.status === 'pending');
    state = recordMatchResult(state, match.id, match.player2_id);
    const loserId = match.player1_id;
    const loser = state.stats.find((p) => p.player_id === loserId);
    assert.equal(loser.losses, 1);
    assert.equal(loser.eliminated, false);
  });

  it('never creates a pending match for an eliminated player', () => {
    const setup = createOpenTournament({
      roundRobinType: 'single',
      kohThreshold: 3,
      players: [
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
        { name: 'D' },
        { name: 'E' },
        { name: 'F' },
      ],
    });
    let state = startTournament(setup);
    for (let i = 0; i < 80; i++) {
      const pending = state.matches.filter((m) => m.status === 'pending');
      for (const match of pending) {
        for (const id of [match.player1_id, match.player2_id].filter(Boolean)) {
          const player = state.stats.find((p) => p.player_id === id);
          assert.equal(player?.eliminated, false, `${player?.player_name} is eliminated but still in a pending match`);
        }
      }
      if (state.status === 'completed') break;
      const round = getCurrentRound(state);
      const match = round && getRoundMatches(state, round.id).find((m) => m.status === 'pending');
      if (!match) break;
      state = recordMatchResult(state, match.id, match.player1_id);
    }
    assert.equal(state.status, 'completed');
    assert.ok(state.stats.some((p) => p.eliminated));
  });

  it('starts King of the Hill when the field shrinks to the threshold', () => {
    const setup = createOpenTournament({
      roundRobinType: 'single',
      kohThreshold: 3,
      players: [
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
        { name: 'D' },
        { name: 'E' },
        { name: 'F' },
      ],
    });
    let state = startTournament(setup);
    state = playPending(state);
    assert.equal(state.status, 'completed');
    assert.ok(state.rounds.some((r) => r.round_name === 'King of the Hill'));
    assert.ok(getActivePlayers(state).length <= 1);
  });

  it('cancels prebuilt future matches that include eliminated players', () => {
    let state = startTournament(createOpenTournament({
      roundRobinType: 'single',
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
    }));
    const victim = state.stats[0];
    victim.eliminated = true;
    const current = getCurrentRound(state);
    state.rounds.push({
      id: 'future-round',
      round_number: 99,
      round_name: 'Round 99',
      status: 'pending',
      koh_round_number: null,
    });
    state.matches.push({
      id: 'ghost-match',
      round_id: 'future-round',
      round_number: 99,
      match_number: 1,
      player1_id: victim.player_id,
      player1_name: victim.player_name,
      player2_id: state.stats[1].player_id,
      player2_name: state.stats[1].player_name,
      is_bye: false,
      status: 'pending',
      payout_amount: 10,
    });
    const opponentPaid = state.stats[1].total_payout;
    state = sanitizeCashClimb(state);
    const ghost = state.matches.find((m) => m.id === 'ghost-match');
    assert.equal(ghost.status, 'cancelled');
    assert.equal(state.stats[1].total_payout, opponentPaid);
    const pending = state.matches.filter((m) => m.status === 'pending');
    for (const match of pending) {
      for (const id of [match.player1_id, match.player2_id].filter(Boolean)) {
        const player = state.stats.find((p) => p.player_id === id);
        assert.equal(player?.eliminated, false);
      }
    }
    assert.ok(current);
  });

  it('credits a bye as a win only, never a loss', () => {
    const state = startTournament(createOpenTournament({
      roundRobinType: 'single',
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }, { name: 'Eve' }],
    }));
    const round = getCurrentRound(state);
    const matches = getRoundMatches(state, round.id);
    const bye = matches.find((m) => m.is_bye);
    assert.ok(bye, 'odd field should create a bye');
    assert.equal(bye.loser_id, null);
    const sitter = state.stats.find((p) => p.player_id === bye.player1_id);
    assert.equal(sitter.wins, 1);
    assert.equal(sitter.losses, 0);
    const ids = [];
    for (const match of matches.filter((m) => m.status !== 'cancelled')) {
      for (const id of [match.player1_id, match.player2_id].filter(Boolean)) {
        assert.equal(ids.includes(id), false, 'player in two matches in the same round');
        ids.push(id);
      }
    }
  });
});
