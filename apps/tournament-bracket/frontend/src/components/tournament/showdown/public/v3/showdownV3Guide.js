/**
 * Player-friendly "How Showdown V3 works" explainer. Procedure only: the game and its playing rules are set
 * by the tournament director. Amounts depend on each event's locked payout plan, so the event page shows
 * them; this guide never shows other versions' payouts. The payout wording describes what new events pay
 * (showdownV3NewEventCopy.js).
 */
import { V3_TIEBREAKERS } from '../../v3/showdownV3Standings.js';
import { v3GuideCopy } from '../../v3/showdownV3NewEventCopy.js';
import { supportedFieldRange } from '../../showdownFieldRules.js';
import { showdownFieldTable } from '../../showdownNewPlayerGuide.js';

export function showdownV3Guide(copy = v3GuideCopy()) {
  const { min, max } = supportedFieldRange();
  const tiebreakers = V3_TIEBREAKERS.map((t) => t.label.charAt(0).toLowerCase() + t.label.slice(1)).join(', then ');
  return {
    code: 'V3',
    title: 'How Cash Climb Showdown V3 works',
    subtitle: 'Win games, earn cash. Make the playoffs, earn more.',
    chips: ['Every game you win pays', 'Two Qualifer matches', 'Top players make the playoffs', copy.chip],
    stages: [
      { label: 'Stage 1', title: 'Qualifers', text: 'Play two matches against two different opponents. \nQualifying matches are not a race. They are a set number of games. \nEvery game you win puts money in your pocket.', meta: 'All games must be played' },
      { label: 'Stage 2', title: 'Playoffs', text: copy.playoffStage, meta: 'Races to a set number of games' },
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
          ...copy.playoffs,
        ],
        tv: ['One loss and you are out.', copy.playoffsTv],
      },
      {
        title: 'The short version',
        body: [
          ...copy.shortLead,
          'Everyone plays at least two matches, more if you make the playoffs.',
          'Every game you win adds to your payout, in qualifying and in the playoffs, even if you lose the match.',
          ...copy.shortPlayoffs,
          'The more games you win, the more you take home.',
        ],
        tv: ['Every game you win pays, even if you lose the match.', 'Everyone plays two matches.', copy.shortTv],
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
          copy.leftover,
          'Event cut short? Everyone keeps what they have earned, and the rest is split among the players still in it.',
          'Want the exact dollar amounts? They are on your event page. Some earlier events worked a little differently.',
        ],
        tv: [copy.leftoverTv, 'Exact amounts are on your event page.'],
      },
    ],
  };
}
