/**
 * Detailed Cash Climb rules for the "Full rules" modal. Section titles match the tour so a card's
 * "Full rules" button can jump straight to its section. Every number and formula comes from the engine.
 * Each section also names the term players see on the bracket and payout table.
 */
import { CASH_CLIMB_V3_LIMITS } from '../cashClimbV3Config.js';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { openingReserves } from '../cashClimbV3Opening.js';
import { GUIDE_EXAMPLE, cashClimbV3GuideExample } from './cashClimbV3GuideExample.js';

export function cashClimbV3GuideRules({ split }) {
  const minPlayers = CASH_CLIMB_V3_LIMITS.minEntrants;
  const minFee = CASH_CLIMB_V3_LIMITS.minEntryFeeCents / 100;
  const { entryFee: E, raceTo: R, preliminaryField } = GUIDE_EXAMPLE;
  const ex = cashClimbV3GuideExample();
  const field = cashClimbV3Shape(preliminaryField);
  const reserve = openingReserves({ entryFeeCents: E * 100, raceTo: R }).main.dollars;
  const sample = `$${E} entry, race to ${R}`;
  const close = ex?.opening[R - 1];
  const shutout = ex?.opening[0];

  return [
    {
      icon: '\u{1F3AF}',
      title: 'How it works',
      body: [
        'Cash Climb is a single-elimination (knockout) tournament. Lose one match and you are out.',
        `An event needs at least ${minPlayers} players and an entry fee of at least $${minFee}, in whole dollars. The tournament director can add money to the prize money, also in whole dollars.`,
        'The prize money is every entry fee plus any added money. When the final is played, all of it is paid to players.',
        'Every match is a race to the same number of racks. The tournament director sets the race, the game and any house rules before the event starts.',
        'Spots in the bracket are drawn at random.',
        'Every payout is a whole-dollar amount. Anything that works out to half a dollar or more rounds up.',
      ],
    },
    {
      icon: '\u{1F4B5}',
      title: 'Your first match',
      body: [
        'On the bracket and payout table, first matches are called the opening round.',
        'Both players are paid when the match is finished, win or lose.',
        'The loser earns the entry fee \u00F7 (2 \u00D7 the race) for every rack they won.',
        'The winner earns the entry fee \u00D7 (3 \u00D7 the race \u2212 the loser\u2019s racks) \u00F7 (4 \u00D7 the race). The closer the match, the more the loser earns and the less the winner earns.',
        'Shutout bonus: if the loser wins no racks, the winner also gets a quarter of the entry fee. A shutout pays back the winner\u2019s whole entry fee.',
        'Each player\u2019s amount is rounded to whole dollars separately.',
        ...(ex ? [
          `Example (${sample}): the loser earns $${ex.opening[1].loser} per rack. A ${close.score} match pays the winner $${close.winner} and the loser $${close.loser}. A ${shutout.score} shutout pays the winner $${shutout.winner}.`,
        ] : []),
      ],
    },
    {
      icon: '\u{1F4C8}',
      title: 'Keep winning',
      body: [
        'Every round after the first match (for example the quarterfinal and semifinal) pays only the winner: a set amount for that round.',
        'The amount is bigger every round, up to the final.',
        'Every round\u2019s amount is worked out from the prize money when the tournament starts and shown on the event\u2019s payout table. It does not change during the event.',
        'The loser of a match in these rounds is not paid for that match, and keeps everything they have already won.',
        ...(ex ? [
          `Example (${ex.entrants} players, ${sample}): ${ex.later.slice(0, -1).map((r) => `${r.name.toLowerCase()} win $${r.amount}`).join(', ')}.`,
        ] : []),
      ],
    },
    {
      icon: '\u{1F3C6}',
      title: 'The final',
      body: [
        'On the bracket and payout table, the final is called the championship.',
        `The final\u2019s amount is the biggest of the night. The champion gets ${split.champion}% of it, rounded to whole dollars, and the runner-up gets the rest.`,
        'Finalist bonus: when the final is played, any prize money not yet paid is added on top, split the same way. That money comes from first matches that did not pay their most (anything but a shutout), no-shows and players who quit.',
        'With the finalist bonus, every dollar of the prize money is paid to players.',
        ...(ex ? [
          `Example (${ex.entrants} players, ${sample}): the final is $${ex.final.allocation}, so the champion gets $${ex.final.champion} and the runner-up $${ex.final.runnerUp}, plus any finalist bonus.`,
        ] : []),
      ],
    },
    {
      icon: '\u{1F39F}\u{FE0F}',
      title: 'Extra match to get in',
      body: [
        'On the bracket and payout table, these are called preliminary matches.',
        'The bracket is the largest full bracket (8, 16, 32, 64 and so on) that fits the number of players.',
        'If there are more players than that, there is one extra match for each player over the bracket size. The winners take the remaining spots for first matches.',
        `Example: with ${field.entrants} players the bracket is ${field.bracketSize}. ${field.preliminaryMatches * 2} players play ${field.preliminaryMatches} extra matches, and ${field.preliminaryByes} go straight into the bracket.`,
        'Who plays an extra match is decided by the draw.',
        'An extra match pays exactly like a first match, at half the amounts. That includes the shutout bonus, which is half as big.',
        'The winner then plays a first match, which pays the normal first-match amounts.',
        'Going straight into the bracket does not pay anything.',
      ],
    },
    {
      icon: '\u{26A0}\u{FE0F}',
      title: 'No-shows and quitting',
      body: [
        'No-show (a forfeit): the player who shows moves on and is paid half of what the match could pay.',
        `In a first match that is half of the most the match can pay in total (at ${sample}, that is $${ex ? ex.half(reserve) : reserve / 2}). In an extra match it is half of that match\u2019s most.`,
        'In the later rounds it is half of that round\u2019s set amount.',
        'In the final it is half of the champion\u2019s share, and nothing is paid to a runner-up.',
        'Quitting partway through a first match or extra match (a withdrawal): each player keeps the per-rack earnings for racks already won, with no winner\u2019s share and no shutout bonus. The other player moves on.',
        'Quitting in a later round: nothing more is paid for that match. The other player moves on.',
        'Quitting in the final: no money for the final is paid. If one player quits, the other is champion. If both quit, there is no champion.',
        'If both players are missing or both quit, nobody moves on. Their next opponent moves on as if by no-show, with half pay.',
        'If the final is not played, there is no finalist bonus, and prize money not yet paid stays with the tournament director.',
      ],
    },
    {
      icon: '\u{1F4A1}',
      title: 'Good to know',
      body: [
        'Money you win is yours. It is never taken back if you lose later.',
        'The tournament director enters every result, and the payouts follow automatically from the score.',
        'Exact dollar amounts for your event are on its payout table.',
      ],
    },
  ];
}
