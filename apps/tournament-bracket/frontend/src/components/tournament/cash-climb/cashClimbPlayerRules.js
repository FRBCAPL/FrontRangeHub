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
          'The last two players may chop remaining leftover 50/50 instead of playing it out.',
        ],
      },
      {
        title: 'Money',
        body: [
          "Win a match, you take that match's posted dollars. Pays are whole dollars and climb as the night goes on.",
          'Money you already won is yours. There is no clawback.',
          'Leftover round-robin money locks when King of the Hill starts: 40% to 3rd last standing, 60% to 2nd last standing. Leftover KOH is the championship.',
          '3rd last leftover is paid as soon as that player sits (or when KOH starts with 2). It is not held until the end.',
          'If last standing would finish behind anyone else in total cash, leftover 2nd-place RR money can move to last standing so they are at least tied. 3rd leftover is never taken back. Ties are allowed.',
        ],
      },
      {
        title: 'The board',
        body: [
          'The number next to your name is cash rank: who has earned the most.',
          'Last standing / 2nd last standing / 3rd last standing is who survived longest in King of the Hill, not who has the most money. Chop means the last two split remaining leftover.',
        ],
      },
    ],
  };
}
