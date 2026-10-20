/**
 * Player-friendly "How Showdown V3 works" explainer. Procedure only: the game and its playing rules are set
 * by the tournament director. Amounts depend on each event's locked payout plan, so the event page shows
 * them; this guide never shows other versions' payouts.
 */
import { V3_TIEBREAKERS } from '../../v3/showdownV3Standings.js';
import { supportedFieldRange } from '../../showdownFieldRules.js';
import { showdownFieldTable } from '../../showdownNewPlayerGuide.js';

export function showdownV3Guide() {
  const { min, max } = supportedFieldRange();
  const tiebreakers = V3_TIEBREAKERS.map((t) => t.label.charAt(0).toLowerCase() + t.label.slice(1)).join(', then ');
  return {
    code: 'V3',
    title: 'How Cash Climb Showdown V3 works',
    subtitle: 'Win games, earn cash. Make the playoffs, earn more.',
    chips: ['Every game you win pays', 'Two Qualifer matches', 'Top players make the playoffs', 'Bigger bonus every round'],
    stages: [
      { label: 'Stage 1', title: 'Qualifers', text: 'Play two matches against two different opponents. \nQualifying matches are not a race. They are a set number of games. \nEvery game you win puts money in your pocket.', meta: 'All games must be played' },
      { label: 'Stage 2', title: 'Playoffs', text: 'The top players go head to head. \nPlayoff matches are a race. Lose and you are out. \n Win and you collect a bonus that grows every round.', meta: 'Races to a set number of games' },
    ],
    fieldTable: showdownFieldTable(),
    sections: [
      {
        title: 'Qualifying',
        body: [
          'Players play two matches against opponents drawn at random when the event starts.',
          'Every game in the match gets played, so every game counts. \nWith an even number of games, a match can end in a tie.',
          'The players who earn the most in qualifying make the playoffs. \nHow many make it depends on how many entered (see the table).',
        ],
        tv: ['Two matches. Every game counts.', 'The top earners make the playoffs.'],
      },
      {
        title: 'Playoffs',
        body: [
          'Players are drawn at random from the qualifying standings to play in the playoffs.',
          'Each match is a race: first to the set number of games wins. \nOne loss and you are out.',
          'Every game you win still pays, and the match winner also collects a bonus that gets bigger every round.',
          'With 5\u20137 players in the playoffs, the top qualifiers skip straight to the semifinals and get half a first-round bonus for the bye.',
        ],
        tv: ['One loss and you are out.', 'Every game still pays, plus a bonus for each match you win.'],
      },
      {
        title: 'The short version',
        body: [
          'Everyone plays at least two matches, more if you make the playoffs.',
          'Every game you win adds to your payout, in qualifying and in the playoffs, even if you lose the match.',
          'Make the playoffs and every match you win adds a bonus that grows each round.',
          'The more games you win, the more you take home.',
        ],
        tv: ['Every game you win pays, even if you lose the match.', 'Everyone plays two matches.', 'Playoff wins add a bonus that grows each round.'],
      },
      {
        title: 'On your phone',
        body: [
          'Open the event on your phone to follow the climb.',
          'The bracket and money are live, and you can send in your scores.',
          'The tournament director must approve every score.',
        ],
        tv: ['Follow along and send in your scores from your phone.'],
      },
      {
        title: 'Good to know',
        body: [
          `Tied in the standings? It comes down to ${tiebreakers}. Still tied for the last playoff spot or bye? A shootout settles it.`,
          'Opponent a no-show in qualifying? You still get paid for those games.',
          'Money left over in the playoffs? It goes to the champion, like when a race to 5 ends 5\u20130.',
          'Event cut short? Everyone keeps what they have earned, and the rest is split among the players still in it.',
          'Want the exact dollar amounts? They are on your event page. Some earlier events worked a little differently.',
        ],
        tv: ['Leftover playoff money goes to the champion.', 'Exact amounts are on your event page.'],
      },
    ],
  };
}
