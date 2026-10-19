/**
 * General Cash Climb Showdown explainer for first-timers. It explains tournament procedure only:
 * the game and its playing rules are set by the tournament director, not by Showdown.
 * Numbers come from the format rules, so the guide stays right if they change.
 */
import { MIN_ENTRY_FEE, SHOWDOWN_NAME, TIEBREAKERS, V2_QUALIFYING_RACE_TO, V2_PLAYOFF_RACE_TO, V2_RACK_PAY, V2_RACK_RESERVE_PER_MATCH } from './showdownRules.js';
import { FIELD_RULES, supportedFieldRange } from './showdownFieldRules.js';
import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { qualifyingWinPay } from './showdownPayout.js';

/** One row per approved field size: entrants, qualifiers, byes. */
export function showdownFieldTable() {
  return FIELD_RULES.map((r) => ({
    entrants: r.min === r.max ? String(r.min) : `${r.min}\u2013${r.max}`,
    qualifiers: r.qualifiers,
    byes: playoffTemplate(r.templateId)?.byes || 0,
  }));
}

export function showdownNewPlayerGuide() {
  const { min, max } = supportedFieldRange();
  const fee = MIN_ENTRY_FEE;
  const q = qualifyingWinPay(fee);
  const tiebreakers = TIEBREAKERS.map((t, i) => `${i + 1}. ${t.label}`).join(' \u00b7 ');
  return {
    title: `How ${SHOWDOWN_NAME} works`,
    subtitle: 'Two qualifying matches, then a playoff bracket.',
    qualifyingRaceTo: V2_QUALIFYING_RACE_TO,
    playoffRaceTo: V2_PLAYOFF_RACE_TO,
    fieldTable: showdownFieldTable(),
    sections: [
      {
        title: 'What it is',
        body: [
          `A cash pool tournament for ${min}\u2013${max} players. The whole entry pool is paid back out to players.`,
          'It is not the same as the original Cash Climb: there is no 3-loss round robin and no King of the Hill.',
          'The tournament director announces the game and its playing rules. Showdown only records who wins each game.',
        ],
      },
      {
        title: 'Qualifying',
        body: [
          'Players are drawn at random into a circle. You play the two players next to you, so everyone plays exactly 2 qualifying matches.',
          `Qualifying matches are races to ${V2_QUALIFYING_RACE_TO} games: the first player to win ${V2_QUALIFYING_RACE_TO} games wins the match.`,
          'The top players in the standings reach the playoffs. How many depends on the number of entrants (see the table).',
        ],
      },
      {
        title: 'Ties in the standings',
        body: [
          `Tiebreakers in order: ${tiebreakers}.`,
          'When a tiebreaker separates players, their order is fixed. Players still tied start again at tiebreaker 1.',
          'Head-to-head only counts between exactly two tied players who played each other.',
          'Players still tied after all six at the playoff cutoff or the last bye play a shootout: single-game matches, the winner stays at the table, two losses and you are out.',
        ],
        tv: [
          'Tiebreakers: match wins, games won, fewest games lost, head-to-head (two players only), opponents\u2019 match wins, opponents\u2019 game differential.',
          'Still tied at the cutoff or the last bye? A shootout decides it.',
        ],
      },
      {
        title: 'Playoffs',
        body: [
          `Single elimination, races to ${V2_PLAYOFF_RACE_TO} games. Lose once and you are out.`,
          'With 5\u20137 qualifiers, the top-ranked qualifiers get a bye straight to the semifinals.',
          'Everyone else is drawn into the bracket at random, so the bracket is not seeded beyond the byes.',
        ],
      },
      {
        title: 'How you get paid',
        body: [
          'The director picks the payout format for each event; the event page shows which one and its full payout table.',
          `In every format, each qualifying win pays a quarter of the entry fee ($${q} on a $${fee} entry), kept even if you do not qualify. The rest pays playoff wins, each round more than the one before, and a bye pays half a quarterfinal win.`,
          'V1: every qualifier is topped up to the entry fee before the playoff ladder is paid.',
          `V2: every game you win in a played match pays $${V2_RACK_PAY}, even in a match you lose. $${V2_RACK_RESERVE_PER_MATCH} per playoff match is set aside for playoff games; the champion gets whatever is unused plus any match payout nobody won.`,
          'Shootout games, forfeits and walkovers pay no per-game money. The whole pool is paid out.',
        ],
        tv: [
          `Each qualifying win pays $${q} on a $${fee} entry. The rest pays playoff wins; each round pays more. A bye pays half a quarterfinal win.`,
          'V1 tops every qualifier up to the entry fee.',
          `V2 pays $${V2_RACK_PAY} for every game won, win or lose; the champion collects unused playoff game money.`,
        ],
      },
      {
        title: 'Reporting scores',
        body: [
          'Open the event on your phone to follow the standings, bracket and money live.',
          'You can report your score from your phone. The tournament director confirms every score before it counts.',
        ],
      },
    ],
  };
}
