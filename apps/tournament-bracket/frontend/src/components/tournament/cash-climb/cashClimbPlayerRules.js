import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { cashClimbKohRaceTo, cashClimbRrRaceTo, defaultKohRaceTo, defaultRrRaceTo, formatEventRaces, formatRacePhrase } from './cashClimbRace.js';

export function cashClimbPlayerRules(tournament) {
  const rrRace = tournament ? cashClimbRrRaceTo(tournament) : defaultRrRaceTo();
  const kohRace = tournament ? cashClimbKohRaceTo(tournament) : defaultKohRaceTo();
  const gameType = tournament?.gameType || OPEN_TOURNAMENT_STRUCTURE.gameRules.gameType;
  const entryFee = Number(tournament?.entryFee ?? OPEN_TOURNAMENT_STRUCTURE.entryFee) || 0;
  const { callShots, rulesNote, houseRules = [] } = OPEN_TOURNAMENT_STRUCTURE.gameRules;
  const tableRules = [
    `Cash Climb is ${gameType}.`,
    rulesNote ? `${rulesNote}.` : null,
    callShots ? 'Call your shots.' : null,
  ].filter(Boolean).join(' ');

  return {
    gameType,
    entryFee,
    rrRaceLabel: formatRacePhrase(rrRace),
    kohRaceLabel: formatRacePhrase(kohRace),
    eventRaces: formatEventRaces(rrRace, kohRace),
    sections: [
      {
        title: 'The night',
        body: [
          tableRules,
          ...houseRules,
          entryFee
            ? `Everyone pays $${entryFee}. The full entry stays in this event.`
            : 'The full entry stays in this event.',
        ],
      },
      {
        title: 'Round robin',
        body: [
          `Round-robin matches are ${formatRacePhrase(rrRace)}.`,
          'Take 3 losses and you are out of the tournament.',
          'A bye pays about half a match win and does not count as a loss.',
        ],
      },
      {
        title: 'King of the Hill',
        body: [
          'KOH starts when 3 players are still in (or 2 if two players bust in the same round).',
          `KOH is ${formatRacePhrase(kohRace)}. Winner stays. Loser sits.`,
          '2 KOH losses and you are out. Last player standing is the champion.',
        ],
      },
      {
        title: 'Money',
        body: [
          "Win a match, you take that match's posted dollars. Pays are whole dollars and climb as the night goes on.",
          'Money you already won is yours. There is no clawback.',
          'Leftover KOH money is the championship (last standing). Leftover round-robin money splits 60 / 40 to 2nd and 3rd last standing.',
          'If last standing would finish behind anyone else in total cash, enough leftover RR money moves to last standing so they are at least tied. Ties are allowed.',
        ],
      },
      {
        title: 'The board',
        body: [
          'The number next to your name is cash rank: who has earned the most.',
          'Last standing / 2nd last standing / 3rd last standing is who survived longest in King of the Hill, not who has the most money.',
        ],
      },
    ],
  };
}
