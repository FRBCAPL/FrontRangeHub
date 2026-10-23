/**
 * Formula-dependent wording for the generic V3 explainers (guide, comparison table, format summary). These
 * describe what NEW events pay, so they follow the activation switch; each event's own page describes its
 * locked plan instead.
 */
import { V3_D10_FOR_NEW_EVENTS } from './showdownV3Activation.js';

const EQUAL_RATE_COPY = {
  formatSummary: 'Every qualifying match plays a fixed number of games, all of them played, and can end in a tie. Each game won pays; the playoffs are races with a graded championship guarantee.',
  chip: 'Bigger bonus every round',
  playoffStage: 'The top players go head to head. \nPlayoff matches are a race. Lose and you are out. \n Win and you collect a bonus that grows every round.',
  playoffs: [
    'Every game you win still pays, and the match winner also collects a bonus that gets bigger every round.',
    'With 5\u20137 players in the playoffs, the top qualifiers skip straight to the semifinals and get half a first-round bonus for the bye.',
  ],
  playoffsTv: 'Every game still pays, plus a bonus for each match you win.',
  shortLead: [],
  shortPlayoffs: ['Make the playoffs and every match you win adds a bonus that grows each round.'],
  shortTv: 'Playoff wins add a bonus that grows each round.',
  leftover: 'Money left over in the playoffs? It goes to the champion, like when a race to 5 ends 5\u20130.',
  leftoverTv: 'Leftover playoff money goes to the champion.',
  compare: {
    game: 'Same amount in qualifying and playoffs, win or lose',
    playoffWin: 'A bonus that grows each round',
    champion: 'Unused playoff money',
  },
};

const D10_COPY = {
  formatSummary: 'Every qualifying match plays a fixed number of games, all of them played, and can end in a tie. Each game won pays, and game values increase every playoff round; the champion takes the Champion Fund.',
  chip: 'Games pay more every round',
  playoffStage: 'The top players go head to head. \nPlayoff matches are a race. Lose and you are out. \n Every game you win is worth more each round.',
  playoffs: [
    'Every game you win still pays, and each playoff round pays more per game than the round before. There are no match-win bonuses.',
    'With 5\u20137 players in the playoffs, the top qualifiers skip straight to the semifinals and earn a bye credit worth half a full quarterfinal win. A bye credit is not a game won.',
  ],
  playoffsTv: 'Every game still pays, and pays more each round.',
  shortLead: ['Every game won earns money. Game values increase as the tournament progresses. Players receiving an opening-round bye earn a bye credit. Unused game money grows the Champion Fund, which is awarded to the tournament champion.'],
  shortPlayoffs: [],
  shortTv: 'Playoff games pay more each round.',
  leftover: 'The Champion Fund is set aside from the prize pool when the event starts. Money for games that are never played, like when a race to 5 ends 5\u20130, is added to it, and the champion takes all of it. The champion always earns the most.',
  leftoverTv: 'Unplayed game money grows the Champion Fund for the champion.',
  compare: {
    game: 'Pays, win or lose, and more in each playoff round',
    playoffWin: 'Nothing extra; the games you win pay more each round',
    champion: 'The Champion Fund: set aside at the start, plus every unplayed game',
  },
};

export function v3GuideCopy(d10 = V3_D10_FOR_NEW_EVENTS) {
  return d10 ? D10_COPY : EQUAL_RATE_COPY;
}
