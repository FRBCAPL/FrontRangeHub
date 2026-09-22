import { formatMoney } from './breakAndRunMath.js';

/** Public display cards — keep USAPL member wording on Entry. */
export const USAPL_BREAK_AND_RUN_BASIC_RULES = [
  {
    title: 'Entry',
    body: 'Open to everyone.\nUSAPL Members & Tournament players · member rate.\nEveryone else · open rate.\nOne attempt per entry.',
  },
  {
    title: 'Press your luck',
    body: 'Every ball is worth money.\nAfter you make one, take the money or keep shooting.\nKeep shooting and miss — you lose it all.',
  },
  {
    title: 'Per ball',
    body: 'Each ball currently pays: per-ball amount.\nCalled early 10 pays early-10 amount (2×) and ends the run paid.',
  },
  {
    title: 'Rebuy',
    body: 'Zero payable balls → one rebuy. \nAny payable ball → no rebuy (even if you bust).',
  },
];

/** Fill Entry / Per ball cards with live fees and payout amounts. */
export function basicRulesWithFees({
  memberFee = 10,
  openFee = 20,
  perBall = 0,
  earlyTenPays = 0,
} = {}) {
  const member = formatMoney(memberFee);
  const open = formatMoney(openFee);
  const per = formatMoney(perBall);
  const early = formatMoney(earlyTenPays);
  return USAPL_BREAK_AND_RUN_BASIC_RULES.map((rule) => {
    let body = String(rule.body || '');
    if (rule.title === 'Entry') {
      body = body
        .replace(/member rate/gi, member)
        .replace(/open rate/gi, open);
    }
    if (rule.title === 'Per ball') {
      body = body
        .replace(/per-ball amount/gi, per)
        .replace(/early-10 amount/gi, early);
    }
    return body === rule.body ? rule : { ...rule, body };
  });
}

/** Official / full rules — tournament-day $10 / $20 wording (no “USAPL members” on Entry). */
export const USAPL_BREAK_AND_RUN_RULES = [
  {
    title: 'Entry',
    body: '$10 for players entered in a tournament that day. $20 for players not entered in a tournament that day. Each entry receives one Break & Run attempt.',
  },
  {
    title: 'Rebuys',
    body: 'If a player earns zero payable balls, they may rebuy for another attempt. Once a player has earned at least one payable ball, they are no longer eligible to rebuy — including if they later busted with those balls at risk.',
  },
  {
    title: 'Pot & ball value',
    body: 'The payable pot (current pot minus house reserve) divided by 10 determines the value of each ball. Each payable ball is worth 1× the current per-ball value. Money remaining after a successful cash-out carries over.',
  },
  {
    title: 'Reserve',
    body: 'The house sets a dollar reserve that is not paid out on turns. The operator can raise or lower the reserve at any time.',
  },
  {
    title: 'Cash out or continue',
    body: 'After earning at least one payable ball, the player may cash out or continue. Cash out before the next shot to end the run and collect all payable balls earned. If they continue, all money from that run stays at risk. A miss, scratch, or foul after continuing ends the run with no payout for that attempt. Once the next shot begins, they cannot cash out the previous amount after that shot’s result.',
  },
  {
    title: 'Legal break',
    body: 'The cue ball must contact the 1-ball first, and at least 4 object balls must contact a rail.',
  },
  {
    title: 'Balls on the break',
    body: 'Balls legally pocketed on the break count as payable balls and do not have to be called. If one or more balls are legally pocketed on the break, the player may cash out immediately or continue shooting.',
  },
  {
    title: 'Scratch on the break',
    body: 'A scratch on the break immediately ends the run with no payout.',
  },
  {
    title: 'After the break',
    body: 'All shots after the break are call shot. The cue ball must contact the lowest-numbered ball on the table first. Combination shots are allowed if the lowest-numbered ball is contacted first. Each legally pocketed called ball adds 1× the current per-ball value. After each successful shot, the player may cash out or continue. A miss, scratch, or foul ends the run and forfeits the entire accumulated payout from that attempt.',
  },
  {
    title: 'Early 10-ball',
    body: 'A legally pocketed called 10-ball before the 10 is the lowest-numbered ball earns 2× the current per-ball value, immediately ends the run, and pays the accumulated amount including the double-value 10. If the player pockets their called ball and the 10 is accidentally pocketed on the same shot, the 10 is spotted with no payout for the 10, and the run may continue or cash out. If the 10 is accidentally pocketed but the called ball is missed, the 10 is spotted, the run ends, and the accumulated payout is lost.',
  },
  {
    title: 'Remaining pot',
    body: 'All money remaining after payouts, including the reserve, stays in the Break & Run pot for future attempts.',
  },
];

export const USAPL_BREAK_AND_RUN_EXAMPLE =
  'Pot = $500 → $50 per ball. Make 2 on the break ($100 at risk): cash out for $100, or continue. Continue and make 3 more called balls = $250 at risk. Cash out for $250, or continue and miss → $0. Called early 10 instead adds $100 and ends the run paid at $350.';

export const USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE =
  'Pot = $500, reserve = $100 → payable $400 → $40 per ball. Cash out 5 balls + early 10 = $280. Bust after making 5 = $0 paid; those 5 balls still block a rebuy. Scratch on the break = $0.';

export const USAPL_BREAK_AND_RUN_TAGLINE =
  'Every ball is worth money. \nAfter you make one, you can take the money or keep shooting. \nKeep shooting and miss—you lose it all.';

/**
 * Full rules modal when publicFacing (TV / phone “Full rules”).
 * Edit this list directly. Keep USAPL member wording on Entry.
 * Do not mention house reserve here.
 */
export const USAPL_BREAK_AND_RUN_PUBLIC_RULES = [
  {
    title: 'Entry',
    body: 'Member rate for USAPL members and players entered in that day’s tournament. \nOpen rate for all other players. Each entry receives one Break & Run attempt.',
  },
  {
    title: 'Rebuys',
    body: 'If a player earns zero payable balls, they may rebuy for another attempt. Once a player has earned at least one payable ball, they are no longer eligible to rebuy — including if they later busted with those balls at risk.',
  },
  {
    title: 'Pot & ball value',
    body: 'The current pot divided by 10 determines the value of each ball. Each payable ball is worth 1× the current per-ball value. Money remaining after a successful cash-out carries over.',
  },
  {
    title: 'Cash out or continue',
    body: 'After earning at least one payable ball, the player may cash out or continue. Cash out before the next shot to end the run and collect all payable balls earned. If they continue, all money from that run stays at risk. A miss, scratch, or foul after continuing ends the run with no payout for that attempt. Once the next shot begins, they cannot cash out the previous amount after that shot’s result.',
  },
  {
    title: 'Legal break',
    body: 'The cue ball must contact the 1-ball first, and at least 4 object balls must contact a rail.',
  },
  {
    title: 'Balls on the break',
    body: 'Balls legally pocketed on the break count as payable balls and do not have to be called. If one or more balls are legally pocketed on the break, the player may cash out immediately or continue shooting.',
  },
  {
    title: 'Scratch on the break',
    body: 'A scratch on the break immediately ends the run with no payout.',
  },
  {
    title: 'After the break',
    body: 'All shots after the break are call shot. The cue ball must contact the lowest-numbered ball on the table first. Combination shots are allowed if the lowest-numbered ball is contacted first. Each legally pocketed called ball adds 1× the current per-ball value. After each successful shot, the player may cash out or continue. A miss, scratch, or foul ends the run and forfeits the entire accumulated payout from that attempt.',
  },
  {
    title: 'Early 10-ball',
    body: 'A legally pocketed called 10-ball before the 10 is the lowest-numbered ball earns 2× the current per-ball value, immediately ends the run, and pays the accumulated amount including the double-value 10. If the player pockets their called ball and the 10 is accidentally pocketed on the same shot, the 10 is spotted with no payout for the 10, and the run may continue or cash out. If the 10 is accidentally pocketed but the called ball is missed, the run ends and the accumulated payout is lost.',
  },
  {
    title: 'Remaining pot',
    body: 'All money remaining after payouts stays in the Break & Run pot for future attempts.',
  },
];

/** @deprecated */
export const LEGENDS_BREAK_AND_RUN_RULES = USAPL_BREAK_AND_RUN_RULES;
/** @deprecated */
export const LEGENDS_BREAK_AND_RUN_EXAMPLE = USAPL_BREAK_AND_RUN_EXAMPLE;
