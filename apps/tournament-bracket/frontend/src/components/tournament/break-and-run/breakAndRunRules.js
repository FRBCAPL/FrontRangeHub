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
    body: 'No payout on the last try → rebuy again anytime this session.\nCash out → done for this session. Play again when the next session starts.',
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

/** Official / full rules — continuous pot with play sessions. */
export const USAPL_BREAK_AND_RUN_RULES = [
  {
    title: 'Continuous pot',
    body: 'Front Range Pool League Break & Run is one continuous pot across dates and locations. \nMoney left after payouts stays in the pot for future sessions.',
  },
  {
    title: 'Entry',
    body: '$10: Front Range Pool League Members and players entered in a tournament that day. \n$20: Open entry for everyone else. \nEach entry receives one Break & Run attempt.',
  },
  {
    title: 'Sessions',
    body: 'Operators start and end play sessions (for example a night, venue, or timeframe). \nThe pot carries forward between sessions.',
  },
  {
    title: 'Rebuys',
    body: 'If the last attempt paid $0 (scratch, bust, or zero balls), the player may rebuy as many times as they want in the current session — each rebuy is a new entry fee into the pot. If the player cashes out and receives a payout, they are finished for that session and may play again when the next session starts.',
  },
  {
    title: 'Pot & ball value',
    body: 'The payable pot divided by 10 determines the value of each ball. \nEach payable ball is worth 1× the current per-ball value.\n Money remaining after a successful cash-out carries over.',
  },
  {
    title: 'Cash out or continue',
    body: 'After earning at least one payable ball, the player may cash out or continue. \nCash out before the next shot to end the run and collect all payable balls earned. \nIf they continue, all money from that run stays at risk. \nA miss, scratch, or foul after continuing ends the run with no payout for that attempt. \nOnce the next shot begins, they cannot cash out the previous amount after that shot’s result.',
  },
  {
    title: 'Legal break',
    body: 'The cue ball must contact the 1-ball first, and a ball pocketed or at least 4 object balls must contact a rail.',
  },
  {
    title: 'Balls on the break',
    body: 'Balls legally pocketed on the break count as payable balls and do not have to be called. \nIf one or more balls are legally pocketed on the break, the player may cash out immediately or continue shooting.',
  },
  {
    title: 'Scratch on the break',
    body: 'A scratch on the break immediately ends the run with no payout.',
  },
  {
    title: 'After the break',
    body: 'All shots after the break are call shot. \nThe cue ball must contact the lowest-numbered ball on the table first. \nCombination shots are allowed if the lowest-numbered ball is contacted first. \nEach legally pocketed called ball adds 1× the current per-ball value. \nAfter each successful shot, the player may cash out or continue. \nA miss, scratch, or foul ends the run and forfeits the entire accumulated payout from that attempt.',
  },
  {
    title: 'Early 10-ball',
    body: 'A legally pocketed called 10-ball before the 10 is the lowest-numbered ball earns 2× the current per-ball value, immediately ends the run, and pays the accumulated amount including the double-value 10. \nIf the player pockets their called ball and the 10 is accidentally pocketed on the same shot, the 10 is spotted with no payout for the 10, and the run may continue or cash out. \nIf the 10 is accidentally pocketed but the called ball is missed, the 10 is spotted, the run ends, and the accumulated payout is lost.',
  },
  {
    title: 'Remaining pot',
    body: 'All money remaining after payouts, including the reserve, stays in the Break & Run pot for future attempts and sessions.',
  },
];

export const USAPL_BREAK_AND_RUN_EXAMPLE =
  'Pot = $500 → $50 per ball. Make 2 on the break ($100 at risk): cash out for $100, or continue. Continue and make 3 more called balls = $250 at risk. Cash out for $250, or continue and miss → $0. Called early 10 instead adds $100 and ends the run paid at $350.';

export const USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE =
  'Example: Pot = $500, reserve = $100 → payable $400 → $40 per ball.\nCash out 5 balls + early 10 = $280, then done for this session.\nBust after making 5 = $0 paid; they may rebuy again this session.\nScratch on the break = $0 and rebuy allowed.\n\nReserve: an amount held back from payouts to help fund future sessions if someone wins the entire pot. \nLeftover pot and reserve carry forward between sessions.\n\nAdministration fee: $1 from each $10 entry and $2 from each $20 entry. \nThat fee does not go into the Break & Run pot.';

export const USAPL_BREAK_AND_RUN_TAGLINE =
  'Every ball is worth money. \nAfter you make one, you can take the money or keep shooting. \nKeep shooting and miss—you lose it all.';

/**
 * Full rules modal when publicFacing (TV / phone “Full rules”).
 * Edit this list directly. Keep USAPL member wording on Entry.
 * Do not mention house reserve here.
 */
export const USAPL_BREAK_AND_RUN_PUBLIC_RULES = [
  {
    title: 'Continuous pot',
    body: 'One Break & Run pot continues across nights and venues. Money left after payouts stays for future play.',
  },
  {
    title: 'Entry',
    body: 'Member rate for USAPL members and players entered in that day’s tournament. \nOpen rate for all other players. Each entry receives one Break & Run attempt.',
  },
  {
    title: 'Rebuys',
    body: 'If the last attempt paid $0 (scratch, bust, or zero balls), the player may rebuy as many times as they want in the current session — each rebuy is a new entry fee into the pot. If the player cashes out and receives a payout, they are finished for that session and may play again when the next session starts.',
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
    body: 'All money remaining after payouts stays in the Break & Run pot for future attempts and sessions.',
  },
];

/** @deprecated */
export const LEGENDS_BREAK_AND_RUN_RULES = USAPL_BREAK_AND_RUN_RULES;
/** @deprecated */
export const LEGENDS_BREAK_AND_RUN_EXAMPLE = USAPL_BREAK_AND_RUN_EXAMPLE;
