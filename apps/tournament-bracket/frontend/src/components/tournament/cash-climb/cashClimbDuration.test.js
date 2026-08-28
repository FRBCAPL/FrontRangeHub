import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCashClimbDuration, maxEventRoundsUntilWinner, maxRoundRobinRoundsUntilKoh } from './cashClimbDuration.js';
import { generateRoundRobin } from './cashClimbSchedule.js';

describe('Cash Climb duration estimate', () => {
  it('returns null until there are two players', () => {
    assert.equal(estimateCashClimbDuration({ playerCount: 1, raceTo: 5, gameType: '8-Ball' }), null);
  });

  it('gives a longer estimate for more players and a longer race', () => {
    const eightRace5 = estimateCashClimbDuration({ playerCount: 8, raceTo: 5, gameType: '8-Ball' });
    const sixteenRace7 = estimateCashClimbDuration({ playerCount: 16, raceTo: 7, gameType: '8-Ball' });
    assert.ok(eightRace5.label);
    assert.ok(eightRace5.rrRounds >= 2);
    assert.ok(eightRace5.minutesLow >= 120);
    assert.ok(eightRace5.minutesHigh > eightRace5.minutesLow);
    assert.ok(sixteenRace7.minutesLow > eightRace5.minutesLow);
  });

  it('shortens the estimate for a shorter race', () => {
    const race3 = estimateCashClimbDuration({ playerCount: 8, raceTo: 3, gameType: '9-Ball' });
    const race7 = estimateCashClimbDuration({ playerCount: 8, raceTo: 7, gameType: '8-Ball' });
    assert.ok(race7.minutesLow > race3.minutesLow);
  });

  it('lengthens the estimate when fewer tables are available', () => {
    const fourTables = estimateCashClimbDuration({
      playerCount: 8, raceTo: 5, gameType: '8-Ball', tableCount: 4,
    });
    const oneTable = estimateCashClimbDuration({
      playerCount: 8, raceTo: 5, gameType: '8-Ball', tableCount: 1,
    });
    assert.equal(fourTables.tableCount, 4);
    assert.ok(oneTable.minutesLow > fourTables.minutesLow);
  });

  it('counts fewer 12-player RR rounds than a full single robin', () => {
    const players = Array.from({ length: 12 }, (_, i) => ({ name: `P${i + 1}` }));
    const fullRr = generateRoundRobin(players, 'single').length;
    const untilKoh = maxRoundRobinRoundsUntilKoh(12);
    assert.equal(fullRr, 11);
    assert.ok(untilKoh < fullRr);
    assert.ok(untilKoh >= 2);
    assert.ok(maxEventRoundsUntilWinner(12) > untilKoh);
  });
});
