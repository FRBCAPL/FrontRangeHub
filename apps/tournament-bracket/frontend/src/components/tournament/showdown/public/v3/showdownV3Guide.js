/**
 * General "How Showdown V3 works" explainer. Procedure only: the game and its playing rules are set by
 * the tournament director, and Showdown only records who wins each game. Amounts depend on each event's
 * locked payout plan, so the event page shows them; this guide never shows V1 or V2 payouts.
 */
import { V3_TIEBREAKERS } from '../../v3/showdownV3Standings.js';
import { supportedFieldRange } from '../../showdownFieldRules.js';
import { showdownFieldTable } from '../../showdownNewPlayerGuide.js';

export function showdownV3Guide() {
  const { min, max } = supportedFieldRange();
  const tiebreakers = V3_TIEBREAKERS.map((t, i) => `${i + 1}. ${t.label}`).join(' \u00b7 ');
  return {
    title: 'How Cash Climb Showdown V3 works',
    subtitle: 'Two qualifying matches, then a playoff bracket. Every game you win pays.',
    chips: ['2 qualifying matches', 'Every game is played', 'Ties allowed', 'Every game won pays', 'Playoff races'],
    stages: [
      { label: 'Stage 1', title: 'Qualifying', text: 'Play the two players next to you in the circle: one Round 1 match and one Round 2 match.', meta: 'A set number of games, all played' },
      { label: 'Stage 2', title: 'Playoffs', text: 'The top of the standings play single elimination. Every game won pays, and every match winner earns a winner\u2019s bonus.', meta: 'Races to a set number of games' },
    ],
    fieldTable: showdownFieldTable(),
    sections: [
      {
        title: 'What it is',
        body: [
          `A cash tournament for ${min}\u2013${max} players. The whole entry pool is paid back out to players.`,
          'When the event starts, the pool is divided into game pay, playoff game pay and match-win bonuses, and that payout plan is locked for the whole event.',
          'The tournament director announces the game and its playing rules. Showdown only records who wins each game.',
        ],
        tv: ['The whole entry pool is paid to players, by a payout plan locked when the event starts.', 'The director sets the game and its rules. Showdown only records who wins each game.'],
      },
      {
        title: 'Qualifying',
        body: [
          'Players are drawn at random into a circle. You play the two players next to you: one Round 1 match and one Round 2 match.',
          'Every qualifying match has the same number of games and every game is played, so a match can end in a tie.',
          'Standings are ranked by qualifying dollars: the money you earned from the games you won, plus any forfeit credits.',
        ],
        tv: ['One Round 1 and one Round 2 match. Every game is played, so a tie is possible.', 'Standings are ranked by qualifying dollars.'],
      },
      {
        title: 'Ties in the standings',
        body: [
          `Tiebreakers in order: ${tiebreakers}.`,
          'Players still tied at the playoff cutoff or the last bye play a shootout.',
        ],
      },
      {
        title: 'Playoffs',
        body: [
          'Single elimination: lose once and you are out. Every playoff match is a race: the first player to win the set number of games wins.',
          'With 5\u20137 qualifiers, the top-ranked qualifiers get a bye straight to the semifinals.',
          'Everyone else is drawn into the bracket at random.',
        ],
        tv: ['Single elimination races. The top qualifiers may get a bye to the semifinals.'],
      },
      {
        title: 'How you get paid',
        body: [
          'Every game you win pays, even in a match you lose. A Round 2 qualifying game pays more than a Round 1 game.',
          'In the playoffs every game won pays too, and the match winner also earns that round\u2019s winner\u2019s bonus. Later rounds pay bigger bonuses; a bye pays a set amount.',
          'If your opponent forfeits, you get an administrative credit for the unplayed games. It counts toward qualifying dollars, not games won.',
          'Money nobody wins goes to the champion when the event is completed. The event page shows this event\u2019s exact amounts.',
        ],
        tv: ['Every game won pays. Round 2 games pay more.', 'Playoff games pay, plus a winner\u2019s bonus for each match won.', 'Money nobody wins goes to the champion.'],
      },
      {
        title: 'If the event stops early',
        body: ['If the event has to stop, for example in an emergency or because the venue closes, players keep everything they earned and the rest is split among the players still in the event.'],
      },
      {
        title: 'Reporting scores',
        body: [
          'Open the event on your phone to follow the standings, bracket and money live, and report your score.',
          'A qualifying score must add up to the match\u2019s number of games; a tie is fine. A playoff score must show one player reaching the race.',
          'The tournament director confirms every score before it counts.',
        ],
        tv: ['Report your score from your phone. The director confirms every score.'],
      },
    ],
  };
}
