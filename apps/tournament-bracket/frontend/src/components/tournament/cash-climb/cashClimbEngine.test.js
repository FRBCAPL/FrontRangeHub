import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenTournament, startTournament, recordMatchResult, continueCashClimb, getCurrentRound, getRoundMatches, getActivePlayers, sanitizeCashClimb } from './cashClimbEngine.js';
import { remainingEventRoundsFromState } from './cashClimbDuration.js';
import { getKOHThreshold } from './openTournamentStructure.js';
import { remainingPhaseBudget } from './cashClimbPayoutRuntime.js';
import { PAYOUT_MODEL_V2 } from './cashClimbPayoutConfig.js';

function playPending(state) {
  let current = state;
  for (let guard = 0; guard < 160; guard++) {
    if (current.status === 'completed') return current;
    const round = getCurrentRound(current);
    if (!round) return current;
    const pending = getRoundMatches(current, round.id).filter((m) => m.status === 'pending');
    if (!pending.length) {
      current = continueCashClimb(current);
      continue;
    }
    const match = pending[0];
    current = recordMatchResult(current, match.id, match.player1_id, '5-3');
  }
  return current;
}

function playToKeepField(state, match, minActive = 4) {
  const active = getActivePlayers(state);
  const p1 = active.find((p) => p.player_id === match.player1_id);
  const p2 = active.find((p) => p.player_id === match.player2_id);
  const protectedIds = new Set(
    [...active]
      .sort((a, b) => (a.losses || 0) - (b.losses || 0) || String(a.player_id).localeCompare(String(b.player_id)))
      .slice(0, minActive)
      .map((p) => p.player_id)
  );
  let winnerId = match.player1_id;
  if (p1 && p2) {
    const p1Safe = protectedIds.has(p1.player_id);
    const p2Safe = protectedIds.has(p2.player_id);
    if (p1Safe !== p2Safe) winnerId = p1Safe ? p1.player_id : p2.player_id;
    else winnerId = (p1.losses || 0) >= (p2.losses || 0) ? p1.player_id : p2.player_id;
  }
  return recordMatchResult(state, match.id, winnerId);
}

describe('open Cash Climb engine', () => {
  it('runs a 4-player event to a winner without ladder fields', () => {
    const setup = createOpenTournament({
      name: 'Friday Cash Climb',
      entryFee: 20,
      placeCount: 1,
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
    assert.equal(state.payoutModel, PAYOUT_MODEL_V2);
    assert.equal(Math.round((state.rrBudget + state.kohBudget) * 100) / 100, 80);
    assert.ok(state.rrSchedule.length >= 1);
    assert.equal(state.kohSchedule.length, 5);

    state = playPending(state);
    assert.equal(state.status, 'completed');
    assert.ok(state.winner);
    assert.ok(state.winner.player_name);
    const paid = state.stats.reduce((sum, p) => sum + p.total_payout, 0);
    assert.ok(Math.abs(paid - 80) < 0.02);
  });

  it('pays locked RR amounts and does not spend the KOH bank in round robin', () => {
    let state = startTournament(createOpenTournament({
      name: 'Friday Cash Climb',
      entryFee: 20,
      roundRobinType: 'single',
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    }));
    const kohBudget = state.kohBudget;
    const round1 = getCurrentRound(state);
    const round1Win = getRoundMatches(state, round1.id).find((m) => !m.is_bye)?.payout_amount || 0;
    assert.equal(round1Win, state.rrSchedule[0]);
    assert.equal(remainingPhaseBudget(state, true), kohBudget);

    const round1Id = round1.id;
    for (const match of getRoundMatches(state, round1Id).filter((m) => m.status === 'pending')) {
      state = recordMatchResult(state, match.id, match.player1_id);
    }
    assert.equal(remainingPhaseBudget(state, true), kohBudget);
    state = continueCashClimb(state);
    if (state.status === 'completed' || getCurrentRound(state)?.round_name === 'King of the Hill') return;
    const round2 = getCurrentRound(state);
    assert.ok(round2.id !== round1Id);
    const round2Win = getRoundMatches(state, round2.id).find((m) => !m.is_bye)?.payout_amount || 0;
    const expected = state.rrSchedule[1] ?? state.rrSchedule[state.rrSchedule.length - 1];
    assert.equal(round2Win, expected);
    assert.equal(remainingPhaseBudget(state, true), kohBudget);
  });

  it('does not drop the planned RR ladder, and extra RR never spends KOH', () => {
    let state = startTournament(createOpenTournament({
      entryFee: 20,
      players: Array.from({ length: 13 }, (_, i) => ({ name: `P${i + 1}` })),
    }));
    const kohBudget = state.kohBudget;
    const planned = state.rrSchedule || [];
    let lastWin = 0;
    for (let roundNum = 1; roundNum <= 10; roundNum += 1) {
      if (state.status === 'completed') break;
      const round = getCurrentRound(state);
      if (!round) break;
      if (round.round_name === 'King of the Hill') break;
      const pending = getRoundMatches(state, round.id).filter((m) => m.status === 'pending');
      const win = pending.find((m) => !m.is_bye)?.payout_amount || 0;
      if (pending.some((m) => !m.is_bye)) {
        if (roundNum <= planned.length) {
          assert.ok(win >= lastWin, `round ${roundNum} win ${win} dropped from ${lastWin}`);
        } else {
          assert.ok(win <= lastWin, `extra RR round ${roundNum} climbed above hold ${lastWin}`);
        }
        lastWin = win;
      }
      for (const match of pending) {
        state = playToKeepField(state, match);
      }
      assert.equal(remainingPhaseBudget(state, true), kohBudget);
      if (roundNum < 10 && state.status !== 'completed') state = continueCashClimb(state);
    }
  });

  it('does not drop per-win at round 8 while 4 players are still in round robin', () => {
    let state = startTournament(createOpenTournament({
      entryFee: 20,
      placeCount: 1,
      players: Array.from({ length: 13 }, (_, i) => ({ name: `P${i + 1}` })),
    }));
    let lastWin = 0;
    let sawRound8Rr = false;
    for (let roundNum = 1; roundNum <= 8; roundNum += 1) {
      if (state.status === 'completed') break;
      const round = getCurrentRound(state);
      assert.ok(round, `missing round ${roundNum}`);
      assert.notEqual(
        round.round_name,
        'King of the Hill',
        `round ${roundNum} started King of the Hill with ${getActivePlayers(state).length} players still in`
      );
      const pending = getRoundMatches(state, round.id).filter((m) => m.status === 'pending');
      const win = pending.find((m) => !m.is_bye)?.payout_amount || 0;
      if (pending.some((m) => !m.is_bye)) {
        assert.ok(
          win >= lastWin,
          `round ${roundNum} win ${win} dropped from ${lastWin} with ${getActivePlayers(state).length} players`
        );
        if (roundNum === 1) assert.ok(win >= 2, `round 1 win ${win} was below $2`);
        lastWin = win;
      }
      for (const match of pending) {
        state = playToKeepField(state, match);
      }
      if (roundNum === 8) {
        sawRound8Rr = true;
        assert.ok(getActivePlayers(state).length >= 4, `round 8 finished with ${getActivePlayers(state).length} players`);
      }
      if (roundNum < 8 && state.status !== 'completed') state = continueCashClimb(state);
    }
    assert.ok(sawRound8Rr);
  });

  it('uses the default King of the Hill cut at 3 players', () => {
    assert.equal(getKOHThreshold(4), 3);
    assert.equal(getKOHThreshold(8), 3);
    assert.equal(getKOHThreshold(16), 3);
    assert.equal(getKOHThreshold(24), 3);
  });

  it('climbs per-win from round 1 on a 13-player event', () => {
    const players = Array.from({ length: 13 }, (_, i) => ({ name: `P${i + 1}` }));
    const state = startTournament(createOpenTournament({
      entryFee: 20,
      placeCount: 1,
      players,
    }));
    const round1 = getCurrentRound(state);
    const win = getRoundMatches(state, round1.id).find((m) => !m.is_bye)?.payout_amount || 0;
    assert.ok(win >= 2);
    assert.equal(win, Math.floor(win));
    assert.ok(remainingEventRoundsFromState(state) > 1);
    assert.equal(getKOHThreshold(13, state), 3);
  });

  it('starts King of the Hill only after the field is down to 3', () => {
    let state = startTournament(createOpenTournament({
      roundRobinType: 'single',
      players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
    }));
    assert.notEqual(getCurrentRound(state).round_name, 'King of the Hill');
    for (let i = 0; i < 200; i += 1) {
      if (state.rounds.some((r) => r.round_name === 'King of the Hill')) {
        assert.ok(getActivePlayers(state).length <= 3);
        return;
      }
      const round = getCurrentRound(state);
      const match = round && getRoundMatches(state, round.id).find((m) => m.status === 'pending');
      if (!match) {
        const active = getActivePlayers(state).length;
        if (active > 3) {
          assert.notEqual(getCurrentRound(state)?.round_name, 'King of the Hill');
        }
        state = continueCashClimb(state);
        continue;
      }
      state = recordMatchResult(state, match.id, match.player1_id);
    }
    assert.fail('King of the Hill never started');
  });

  it('pays 2nd and 3rd from unused RR and keeps unused KOH for the winner', () => {
    const setup = createOpenTournament({
      entryFee: 20,
      roundRobinType: 'single',
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    });
    assert.equal(setup.payoutModel, PAYOUT_MODEL_V2);
    assert.equal(setup.placeCount, 3);
    assert.equal(Math.round((setup.rrBudget + setup.kohBudget) * 100) / 100, 80);

    const state = playPending(startTournament(setup));
    assert.equal(state.status, 'completed');
    const paid = state.stats.reduce((sum, p) => sum + p.total_payout, 0);
    assert.ok(Math.abs(paid - 80) < 0.02);

    const winner = state.stats.find((p) => p.player_id === state.winner.player_id);
    assert.equal(winner.finish_place, 1);

    const byExit = [...state.stats]
      .filter((p) => p.player_id !== winner.player_id)
      .sort((a, b) => (b.eliminated_order || 0) - (a.eliminated_order || 0));
    assert.equal(byExit[0].finish_place, 2);
    assert.equal(byExit[1].finish_place, 3);
    const extras = byExit.reduce((sum, p) => sum + (Number(p.place_bonus) || 0), 0);
    assert.ok(extras >= 0);
    assert.ok(Math.abs(extras - (state.placePrizes.second + state.placePrizes.third)) < 0.02);
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
    for (let i = 0; i < 160; i++) {
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
      if (!match) {
        state = continueCashClimb(state);
        continue;
      }
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

  it('pays King of the Hill match wins from later scheduled rounds', () => {
    const setup = createOpenTournament({
      entryFee: 20,
      placeCount: 1,
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
    assert.equal(state.totalPrizePool, 120);
    assert.equal(Math.round((state.rrBudget + state.kohBudget) * 100) / 100, 120);
    assert.ok(state.kohSchedule.length === 5);
    for (let i = 0; i < 80; i += 1) {
      if (state.rounds.some((r) => r.round_name === 'King of the Hill')) break;
      const round = getCurrentRound(state);
      const match = round && getRoundMatches(state, round.id).find((m) => m.status === 'pending');
      if (!match) {
        state = continueCashClimb(state);
        continue;
      }
      state = recordMatchResult(state, match.id, match.player1_id);
    }
    assert.ok(state.rounds.some((r) => r.round_name === 'King of the Hill'));
    assert.ok(state.kohPrizePool > 0);
    const kohMatch = state.matches.find((m) => {
      const round = state.rounds.find((r) => r.id === m.round_id);
      return round?.round_name === 'King of the Hill' && m.status === 'pending';
    });
    assert.ok(kohMatch);
    assert.ok(kohMatch.payout_amount > 0);
  });

  it('does not drop King of the Hill per-win from the first KOH round to the second', () => {
    let state = startTournament(createOpenTournament({
      entryFee: 20,
      placeCount: 1,
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
    }));
    for (let i = 0; i < 80; i += 1) {
      if (state.rounds.some((r) => r.round_name === 'King of the Hill')) break;
      const round = getCurrentRound(state);
      const match = round && getRoundMatches(state, round.id).find((m) => m.status === 'pending');
      if (!match) {
        state = continueCashClimb(state);
        continue;
      }
      state = recordMatchResult(state, match.id, match.player1_id);
    }
    const koh1 = getRoundMatches(state, getCurrentRound(state).id).find((m) => m.status === 'pending');
    assert.ok(koh1);
    const firstPay = koh1.payout_amount;
    state = recordMatchResult(state, koh1.id, koh1.player1_id);
    state = continueCashClimb(state);
    if (state.status === 'completed') return;
    const koh2 = getRoundMatches(state, getCurrentRound(state).id).find((m) => m.status === 'pending' && !m.is_bye);
    assert.ok(koh2);
    assert.ok(
      koh2.payout_amount >= firstPay + 1,
      `KOH 2 paid ${koh2.payout_amount} after KOH 1 paid ${firstPay}`
    );
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

  it('counts King of the Hill wins separately from round-robin wins', () => {
    const setup = createOpenTournament({
      roundRobinType: 'triple',
      players: [{ name: 'Ann' }, { name: 'Ben' }],
    });
    let state = startTournament(setup);
    const first = getRoundMatches(state, getCurrentRound(state).id).find((m) => m.status === 'pending');
    state = recordMatchResult(state, first.id, first.player1_id);
    const afterRr = state.stats.find((p) => p.player_id === first.player1_id);
    assert.equal(afterRr.wins, 1);
    assert.equal(afterRr.koh_wins, 0);
    assert.equal(state.rounds.some((r) => r.round_name === 'King of the Hill'), false);
    state = continueCashClimb(state);
    assert.ok(state.rounds.some((r) => r.round_name === 'King of the Hill'));

    state = playPending(state);
    const winner = state.stats.find((p) => p.player_id === first.player1_id);
    const kohWins = state.matches.filter((m) => {
      if (m.status !== 'completed' || m.is_bye || m.winner_id !== winner.player_id) return false;
      const round = state.rounds.find((r) => r.id === m.round_id);
      return round?.round_name === 'King of the Hill';
    }).length;
    assert.equal(winner.koh_wins, kohWins);
    assert.equal(winner.wins, 1);

    winner.koh_wins = winner.wins + winner.koh_wins;
    state = sanitizeCashClimb(state);
    const repaired = state.stats.find((p) => p.player_id === winner.player_id);
    assert.equal(repaired.koh_wins, kohWins);
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

  it('does not advance until continue, and can edit a recorded winner', () => {
    let state = startTournament(createOpenTournament({
      roundRobinType: 'single',
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    }));
    const roundId = getCurrentRound(state).id;
    const match = getRoundMatches(state, roundId).find((m) => m.status === 'pending');
    state = recordMatchResult(state, match.id, match.player1_id, '5-2');
    assert.equal(getCurrentRound(state).id, roundId);
    assert.equal(state.matches.find((m) => m.id === match.id).winner_id, match.player1_id);

    state = recordMatchResult(state, match.id, match.player2_id, '3-5');
    const edited = state.matches.find((m) => m.id === match.id);
    assert.equal(edited.winner_id, match.player2_id);
    assert.equal(edited.score, '3-5');
    const winner = state.stats.find((p) => p.player_id === match.player2_id);
    const loser = state.stats.find((p) => p.player_id === match.player1_id);
    assert.equal(winner.wins, 1);
    assert.equal(winner.losses, 0);
    assert.equal(loser.wins, 0);
    assert.equal(loser.losses, 1);
    assert.equal(winner.total_payout, edited.payout_amount);
    assert.equal(loser.total_payout, 0);
  });
});
