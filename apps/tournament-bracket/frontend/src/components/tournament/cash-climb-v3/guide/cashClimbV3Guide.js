/**
 * Player-friendly "How Cash Climb works" explainer for the new Cash Climb format. Numbers come from the
 * engine (limits, bracket shape, championship split) so the guide stays right if they change. Exact
 * dollar amounts depend on each event and are on its payout table, never here.
 */
import { CASH_CLIMB_V3_LIMITS } from '../cashClimbV3Config.js';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { championshipSplit } from '../cashClimbV3Championship.js';
import { cashClimbV3GuideDetails } from './cashClimbV3GuideDetails.js';
import { cashClimbV3GuideRules } from './cashClimbV3GuideRules.js';
import { cashClimbV3GuideStory } from './cashClimbV3GuideStory.js';

const EXAMPLE_FIELD = 12;

/** Champion and runner-up percentages of the championship money, from the engine's split. */
export function cashClimbV3FinalSplit() {
  const { champion, runnerUp } = championshipSplit(100);
  return { champion, runnerUp };
}

export function cashClimbV3Guide() {
  const minPlayers = CASH_CLIMB_V3_LIMITS.minEntrants;
  const minFee = CASH_CLIMB_V3_LIMITS.minEntryFeeCents / 100;
  const split = cashClimbV3FinalSplit();
  const splitText = `${split.champion}% to the champion and ${split.runnerUp}% to the runner-up`;
  const ex = cashClimbV3Shape(EXAMPLE_FIELD);
  return {
    title: 'How Cash Climb works',
    subtitle: 'Your first match pays you, win or lose. After that, every win pays more.',
    chips: ['Paid even if you lose your first match', 'Every win pays more', 'Keep everything you win', 'One loss and you\u2019re out'],
    stages: [
      { label: 'Step 1', title: 'Your first match', text: 'Both players get paid. \nThe winner gets more, and the loser earns for every rack they won.', meta: 'Paid win or lose' },
      { label: 'Step 2', title: 'Keep winning', text: 'Every win pays more than the last, all the way to the final.', meta: 'One loss and you are out' },
    ],
    story: cashClimbV3GuideStory(),
    details: cashClimbV3GuideDetails({ split }),
    rules: cashClimbV3GuideRules({ split }),
    journey: [
      { detail: 'signup', label: 'Sign up' },
      { detail: 'opening', label: 'Your first match', money: 2 },
      { detail: 'climb', label: 'Keep winning', money: 4 },
      { detail: 'championship', label: 'The final', money: 5 },
    ],
    faq: [
      { q: 'How much does each match pay?', detail: 'pay' },
      { q: 'Why do some players play an extra match?', detail: 'preliminary' },
      { q: 'What is the shutout bonus?', detail: 'shutout' },
      { q: 'What if my opponent does not show?', detail: 'forfeit' },
      { q: 'Can I lose money I already won?', detail: 'keep' },
      { q: 'Who enters the scores?', detail: 'scores' },
    ],
    sections: [
      {
        icon: '\u{1F3AF}',
        title: 'How it works',
        body: [
          'Cash Climb is a knockout tournament. Lose one match and you are out.',
          'Your first match pays you, win or lose. After that, every win pays more than the last.',
          'All the entry money, plus any added money, goes back to the players.',
          'Every match is a race to the same number of racks. The tournament director tells you the race and the game before the event starts.',
          'Your spot in the bracket is drawn at random.',
        ],
        tv: ['Lose one match and you are out.', 'All the entry money goes back to the players.'],
      },
      {
        icon: '\u{1F4B5}',
        title: 'Your first match',
        body: [
          'Both players get paid, win or lose.',
          'The loser earns money for every rack they won. The winner gets more.',
          'Win without losing a rack (a shutout) and you get your full entry fee back.',
        ],
        tv: ['Both players get paid.', 'The loser earns for every rack won.', 'A shutout gets your entry fee back.'],
      },
      {
        icon: '\u{1F4C8}',
        title: 'Keep winning',
        body: [
          'From your second match on, only the winner gets paid.',
          'Each win pays more than the one before, all the way to the final.',
          'Lose and you are out, but you keep everything you have already won.',
          'The amounts are set before the first match and shown on the payout table. They never change during the event.',
        ],
        tv: ['Every win pays more than the last.', 'Lose and you keep what you have won.'],
      },
      {
        icon: '\u{1F3C6}',
        title: 'The final',
        body: [
          `The final pays the most: ${splitText}.`,
          'Any money left over from earlier in the night is added to the final as a bonus, split the same way.',
        ],
        tv: [`Final: ${split.champion}% champion, ${split.runnerUp}% runner-up.`, 'Leftover money is added as a bonus.'],
      },
      {
        icon: '\u{1F39F}\u{FE0F}',
        title: 'Extra match to get in',
        body: [
          'A full bracket is 8, 16, 32 players and so on. When the number of players does not fit, a few players play one extra match first to get into the bracket.',
          `Example: with ${EXAMPLE_FIELD} players, ${ex.preliminaryMatches * 2} play ${ex.preliminaryMatches} extra matches and ${ex.preliminaryByes} go straight into the bracket.`,
          'An extra match pays the same way as a first match, at half the amounts. Win it and your next match pays like everyone else\u2019s first match.',
        ],
        tv: ['Bracket not full? A few players play one extra match first.', 'It pays like a first match, at half the amounts.'],
      },
      {
        icon: '\u{26A0}\u{FE0F}',
        title: 'No-shows and quitting',
        body: [
          'Opponent does not show? You move on and get half of what the match pays. In the final, that is half the champion\u2019s share.',
          'Opponent quits partway through your first match? You both keep the money for racks already won. Later in the bracket, you just move on.',
          'If both players are missing, nobody moves on, and their next opponent gets through with half pay.',
          'If the final is not played, there is no bonus, and leftover money stays with the tournament director.',
        ],
        tv: ['No-show? You move on with half the match pay.', 'Final not played? No bonus.'],
      },
      {
        icon: '\u{1F4A1}',
        title: 'Good to know',
        body: [
          'Money you win is yours. It is never taken back if you lose later.',
          'The tournament director enters every result.',
          `Cash Climb needs at least ${minPlayers} players and a $${minFee} entry fee.`,
          'Exact dollar amounts for your event are on its payout table.',
        ],
        tv: ['Money you win is yours to keep.', 'Exact amounts are on the payout table.'],
      },
    ],
  };
}
