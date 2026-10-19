/**
 * Test-only: the real completed 14-player, $20 Showdown (template p6, byes P10 and P9), rebuilt from its
 * recorded results. `fourteenPlayerEvent(1)` is the event as it was run (no payoutVersion field, V1 plan);
 * `fourteenPlayerEvent(2)` replays the same results under V2, with the V2 plan locked from them.
 */
import * as E from './showdownEngine.js';

const QUALIFIERS = ['P10', 'P9', 'P7', 'P2', 'P13', 'P14'];
const BYES = ['P10', 'P9'];
const V1_PLAN = { perRound: { quarterfinal: 18, semifinal: 22, final: 32 }, bye: 9, budget: 130, topUps: { P10: 10, P7: 15, P9: 10, P2: 15, P13: 15, P14: 15 } };

const MATCHES = [
  ['q', 'P1', 'P8', 3, 2], ['q', 'P8', 'P5', 2, 3], ['q', 'P5', 'P9', 2, 3], ['q', 'P9', 'P13', 3, 2],
  ['q', 'P13', 'P3', 3, 1], ['q', 'P3', 'P2', 3, 2], ['q', 'P2', 'P6', 3, 0], ['q', 'P6', 'P4', 0, 3],
  ['q', 'P4', 'P12', 1, 3], ['q', 'P12', 'P10', 1, 3], ['q', 'P10', 'P14', 3, 2], ['q', 'P14', 'P7', 3, 2],
  ['q', 'P7', 'P11', 3, 0], ['q', 'P11', 'P1', 3, 2],
  ['quarterfinal', 'P14', 'P13', 5, 3], ['quarterfinal', 'P2', 'P7', 5, 2],
  ['semifinal', 'P10', 'P14', 5, 3], ['semifinal', 'P2', 'P9', 5, 3], ['final', 'P10', 'P2', 5, 4],
];

/** The totals the event actually paid (V1). */
export const V1_TOTALS = { P10: 83, P2: 60, P14: 38, P9: 29, P7: 20, P13: 20, P1: 5, P3: 5, P4: 5, P5: 5, P11: 5, P12: 5, P6: 0, P8: 0 };

function matches() {
  return MATCHES.map(([round, p1, p2, score1, score2], i) => {
    const race = round === 'q' ? 3 : 5;
    const winnerId = score1 === race ? p1 : p2;
    return {
      id: `m${i + 1}`, phase: round === 'q' ? 'qualifying' : 'playoff', roundKey: round === 'q' ? null : round,
      p1, p2, score1, score2, winnerId, loserId: winnerId === p1 ? p2 : p1, result: 'played', status: 'completed', forfeitedBy: [],
    };
  });
}

export function fourteenPlayerEvent(payoutVersion = 1) {
  const players = Array.from({ length: 14 }, (_, i) => ({ id: `P${i + 1}`, name: `Player ${i + 1}`, withdrawnAt: null }));
  const payoutPlan = E.buildPayoutPlan({ entrants: 14, entryFee: 20 });
  const base = {
    id: `showdown-fixture-14-v${payoutVersion}`,
    type: 'cash-climb-showdown',
    formatVersion: 3,
    name: '14-player $20 test',
    status: 'completed',
    settings: { entryFee: 20, qualifyingRaceTo: 3, playoffRaceTo: 5, tableCount: 5, rulesetId: 'texas-express-9ball' },
    players,
    matches: matches(),
    payoutPlan,
    qualification: { qualifierIds: QUALIFIERS, byeIds: BYES, tie: null, short: 0 },
    playoff: { templateId: 'p6', confirmedAt: '2026-10-17T20:00:00.000Z', byes: BYES.map((playerId, i) => ({ playerId, section: i === 0 ? 1 : 4 })) },
    shootouts: [],
    championId: 'P10',
    completedAt: '2026-10-17T23:00:00.000Z',
    audit: [],
  };
  if (payoutVersion === 2) {
    const state = { ...base, payoutVersion: 2 };
    const plan = E.buildPlayoffPlanV2({ payoutPlan, qualifyingRacks: E.qualifyingRacksWon(state) });
    return { ...state, playoffPlan: { ...plan, qualifierIds: QUALIFIERS } };
  }
  const ladder = E.playoffLadder('p6', V1_PLAN.budget);
  const topUpTotal = Object.values(V1_PLAN.topUps).reduce((s, v) => s + v, 0);
  return { ...base, playoffPlan: { ...ladder, qualifierIds: QUALIFIERS, topUps: V1_PLAN.topUps, topUpTotal, qualifyingScheduled: 70, qualifyingPaid: 70, doubleForfeitTransfer: 0 } };
}
