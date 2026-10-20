/**
 * Cash Climb Showdown V1 and V2 explainers for first-timers (V3 has its own guide). Tournament procedure
 * only: the game and its playing rules are set by the tournament director, not by Showdown.
 * Numbers come from the format rules, so the guides stay right if they change.
 */
import {
  MIN_ENTRY_FEE, SHOWDOWN_NAME, TIEBREAKERS, V1_QUALIFYING_RACE_TO, V1_PLAYOFF_RACE_TO,
  V2_QUALIFYING_RACE_TO, V2_PLAYOFF_RACE_TO, V2_RACK_PAY, V2_RACK_RESERVE_PER_MATCH,
} from './showdownRules.js';
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

function sharedSections(qRace, pRace, raceNote) {
  const { min, max } = supportedFieldRange();
  const tiebreakers = TIEBREAKERS.map((t, i) => `${i + 1}. ${t.label}`).join(' \u00b7 ');
  return {
    what: {
      title: 'What it is',
      body: [
        `A cash tournament for ${min}\u2013${max} players. Everyone plays two matches, then the top players move on to the playoffs.`,
        'All of the entry money goes back to the players, and you can win cash even if you do not make the playoffs.',
        'The tournament director will tell you the game and the rules before you start.',
      ],
      tv: ['Two matches each, then the top players go to the playoffs.', 'All of the entry money goes back to the players.'],
    },
    qualifying: {
      title: 'Qualifying',
      body: [
        'Players are drawn at random into a circle. You play the two players next to you, so everyone plays exactly 2 qualifying matches.',
        `Qualifying matches are races to ${qRace} games: the first player to win ${qRace} games wins the match.${raceNote}`,
        'Standings are ranked by match wins. The top players reach the playoffs; how many depends on the number of entrants (see the table).',
      ],
      tv: [`Two qualifying matches, races to ${qRace}.`, 'Standings are ranked by match wins.'],
    },
    ties: {
      title: 'Ties in the standings',
      body: [
        `Tiebreakers in order: ${tiebreakers}.`,
        'If a tiebreaker separates only some of the tied players, those still tied start again at tiebreaker 1.',
        'Head-to-head only counts between exactly two tied players who played each other.',
        'Players still tied for the last playoff spot, or for the last bye, play a shootout: single games, the winner stays at the table, and two losses puts you out.',
      ],
      tv: [
        'Tiebreakers: match wins, games won, fewest games lost, head-to-head (two players only), opponents\u2019 match wins, opponents\u2019 game differential.',
        'Still tied for the last playoff spot or bye? A shootout decides it.',
      ],
    },
    playoffs: {
      title: 'Playoffs',
      body: [
        `Single elimination, races to ${pRace} games. Lose once and you are out.`,
        'With 5\u20137 qualifiers, the top-ranked qualifiers get a bye straight to the semifinals.',
        'Everyone else is drawn into the bracket at random.',
      ],
      tv: [`Single elimination, races to ${pRace}. The top qualifiers may get a bye to the semifinals.`],
    },
    reporting: {
      title: 'Reporting scores',
      body: [
        'Open the event on your phone to follow the standings, bracket and money live.',
        'You can report your score from your phone. The tournament director confirms every score before it counts.',
      ],
      tv: ['Report your score from your phone. The director confirms every score.'],
    },
  };
}

function v1Pay(fee, q) {
  return {
    title: 'How you get paid',
    body: [
      `Each qualifying match win pays a quarter of the entry fee ($${q} on a $${fee} entry), and you keep it even if you do not qualify.`,
      'Every qualifier is topped up to the entry fee, so reaching the playoffs gets your entry back.',
      'The rest of the pool pays playoff match wins, and each round pays more than the one before. A bye pays half of a first-round win.',
      'Games won do not pay on their own. Leftover dollars from rounding go to the championship match, so the whole pool is paid out.',
      'Top-ups and playoff payouts are set when qualifying ends.',
    ],
    tv: [
      `Each qualifying win pays $${q} on a $${fee} entry.`,
      'Every qualifier is topped up to the entry fee.',
      'The rest pays playoff wins, and each round pays more.',
    ],
  };
}

function v2Pay(fee, q) {
  return {
    title: 'How you get paid',
    body: [
      `Every game you win pays $${V2_RACK_PAY}, even in a match you lose.`,
      `Each qualifying match win also pays a quarter of the entry fee ($${q} on a $${fee} entry), and you keep it even if you do not qualify. Qualifiers are not topped up.`,
      `$${V2_RACK_RESERVE_PER_MATCH} per playoff match is set aside to pay for playoff games won. The rest pays playoff match wins, and each round pays more than the one before. A bye pays half of a first-round win.`,
      'Playoff match payouts are set when qualifying ends.',
      'When the event is completed, the champion also gets a bonus: the playoff game money nobody used plus any match payout nobody won.',
      `Shootout games, forfeits and walkovers do not pay $${V2_RACK_PAY} per game. The whole pool is paid out.`,
    ],
    tv: [
      `Every game won pays $${V2_RACK_PAY}, win or lose.`,
      `Each qualifying win also pays $${q} on a $${fee} entry. Playoff wins pay more each round.`,
      'The champion collects unused playoff game money as a bonus.',
    ],
  };
}

/** The V1 or V2 guide, in the same shape as the V3 guide. */
export function showdownRaceGuide(version) {
  const v2 = Number(version) === 2;
  const code = v2 ? 'V2' : 'V1';
  const fee = MIN_ENTRY_FEE;
  const q = qualifyingWinPay(fee);
  const qRace = v2 ? V2_QUALIFYING_RACE_TO : V1_QUALIFYING_RACE_TO;
  const pRace = v2 ? V2_PLAYOFF_RACE_TO : V1_PLAYOFF_RACE_TO;
  const raceNote = v2 ? '' : ' The director may set different race lengths; the event page shows them.';
  const s = sharedSections(qRace, pRace, raceNote);
  return {
    code,
    title: `How ${SHOWDOWN_NAME} ${code} works`,
    subtitle: v2
      ? `Two qualifying matches, then a playoff bracket. Every game you win pays $${V2_RACK_PAY}, and every match win pays.`
      : 'Two qualifying matches, then a playoff bracket. Every match win pays, and every qualifier gets the entry fee back.',
    chips: v2
      ? ['2 qualifying matches', `Every game won pays $${V2_RACK_PAY}`, 'Every match win pays', 'Champion bonus', 'Top seeds get byes']
      : ['2 qualifying matches', 'Every match win pays', 'Qualifiers get the entry back', 'Top seeds get byes'],
    stages: [
      { label: 'Stage 1', title: 'Qualifying', text: 'Play the two players next to you in the circle. Every match win pays.', meta: `Race to ${qRace} games` },
      { label: 'Stage 2', title: 'Playoffs', text: 'The top of the standings play single elimination for the rest of the pool.', meta: `Race to ${pRace} games` },
    ],
    fieldTable: showdownFieldTable(),
    sections: [s.what, s.qualifying, s.ties, s.playoffs, v2 ? v2Pay(fee, q) : v1Pay(fee, q), s.reporting],
  };
}
