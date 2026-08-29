import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenTournament, startTournament, getCurrentRound } from './cashClimbEngine.js';
import {
  cashClimbKohRaceTo,
  cashClimbRrRaceTo,
  formatEventRaces,
  raceToForMatch,
} from './cashClimbRace.js';

describe('Cash Climb race lengths', () => {
  it('defaults round robin to 1 game and KOH to race to 2', () => {
    const setup = createOpenTournament({
      players: [{ name: 'Ann' }, { name: 'Ben' }],
    });
    assert.equal(setup.raceTo, 1);
    assert.equal(setup.kohRaceTo, 2);
    assert.equal(formatEventRaces(setup.raceTo, setup.kohRaceTo), 'RR 1 game • KOH race to 2');
  });

  it('keeps KOH on the old single race when kohRaceTo was never saved', () => {
    const state = { raceTo: 5 };
    assert.equal(cashClimbRrRaceTo(state), 5);
    assert.equal(cashClimbKohRaceTo(state), 5);
  });

  it('uses the KOH race on King of the Hill matches', () => {
    const state = startTournament(createOpenTournament({
      raceTo: 1,
      kohRaceTo: 2,
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }],
    }));
    const round = getCurrentRound(state);
    const match = (state.matches || []).find((m) => m.round_id === round.id);
    assert.equal(raceToForMatch(state, match), 1);
    const kohMatch = { round_id: 'koh-1' };
    const withKoh = {
      ...state,
      rounds: [...state.rounds, { id: 'koh-1', round_name: 'King of the Hill', koh_round_number: 1 }],
    };
    assert.equal(raceToForMatch(withKoh, kohMatch), 2);
  });
});
