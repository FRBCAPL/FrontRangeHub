import { formatMoney } from './breakAndRunMath.js';
import { calledBasicRules } from './breakAndRunCalledRules.js';

/** Public "How it works" cards — short versions of the full rules. */
export const USAPL_BREAK_AND_RUN_BASIC_RULES = [
  {
    title: 'Entry',
    body: 'Open to everyone.\nFront Range Pool League Members & players in an event that day · member rate.\nEveryone else · open rate.\nOne attempt per entry — pay for one attempt at a time.',
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
    body: 'No payout on the last try → rebuy anytime this session and go to the end of the line.\nCash out → done for this session. Play again when the next session starts.',
  },
];

/** Fill Entry / Per ball cards with live fees and payout amounts. */
export function basicRulesWithFees({
  payoutMode,
  memberFee = 10,
  openFee = 20,
  perBall = 0,
  luckyBall = 0,
  earlyTenPays = 0,
  finalTenPays = 0,
} = {}) {
  if (payoutMode === 'called-ball') {
    return calledBasicRules({ memberFee, openFee, perBall, luckyBall, earlyTenPays, finalTenPays });
  }
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

/** Official / full rules — player-facing (operator tips live in setup / play UI, not here). */
export const USAPL_BREAK_AND_RUN_RULES = [
  {
    title: 'Continuous pot',
    body: 'Front Range Pool League Break & Run is one continuous pot across dates, venues, and sessions.\nMoney left after payouts stays in the pot so ball values can grow over time.',
  },
  {
    title: 'Entry',
    body: '$10: Front Range Pool League Members and players entered in an event that day. \n$20: Open entry for everyone else. \nEach entry pays for one Break & Run attempt. \nYou may only pay for one attempt at a time — no buying multiple attempts in advance.', 
  },
  {
    title: 'Sessions',
    body: 'A session is one play window(not a league session) — usually a night or event.\nDuring a session, a cash-out ends your play until the next session starts.\nA $0 result (scratch, bust, or no payout) still allows rebuys in the same session.\nEnding a session does not close the pot. The pot and reserve carry forward to the next session.',
  },
  {
    title: 'Rebuys',
    body: 'If the last attempt paid $0 (scratch, bust, or zero balls), the player may rebuy as many times as they want in the current session — each rebuy is a new entry fee into the pot.\nRebuys are allowed, but you pay for each new attempt only after your last one is finished. \nWhen you rebuy, you go to the end of the line for your next turn.,\nIf the player cashes out and receives a payout, they are finished for that session(no rebuys allowed) and may play again when the next session starts.',
  },
  {
    title: 'Pot & ball value',
    body: 'The payable pot divided by 10 determines the value of each ball, rounded down to the nearest whole dollar. \nEach payable ball is worth 1× the current per-ball value.\n Money remaining after a successful cash-out carries over.',
  },
  {
    title: 'Cash out or continue',
    body: 'After earning at least one payable ball, the player must choose to either cash out or continue. \nCash out before the next shot to end the run and collect all payable balls earned. \nContinue, and all money from that run stays at risk. \nA miss, scratch, or foul after continuing ends the run with no payout for that attempt. \nOnce the next shot begins, players cannot cash out the previous amount after that shot’s result.',
  },
  {
    title: 'Legal break',
    body: 'The cue ball must contact the 1-ball first, and a ball pocketed or at least 4 object balls must contact a rail. \n Failure to complete a legal break results in end of turn.',
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
    body: 'All shots after the break are call shot(ball & pocket). \nThe cue ball must contact the lowest-numbered ball on the table first. \nCombination shots are allowed if the lowest-numbered ball is contacted first. \nEach legally pocketed ball adds 1× the current per-ball value. \nAfter each successful shot, the player may cash out or continue. \nA miss, scratch, or foul ends the run and forfeits the entire accumulated payout from that attempt.',
  },
  {
    title: 'Early 10-ball',
    body: 'A legally pocketed called 10-ball before the 10 is the lowest-numbered ball earns 2× the current per-ball value, immediately ends the run, and pays the accumulated amount including the double-value 10. \nIf the player pockets their called ball and the 10 is accidentally pocketed on the same shot, the 10 is spotted with no payout for the 10, and the run may continue or cash out. \nIf the 10 is accidentally pocketed but the called ball is missed, the run ends, and the accumulated payout is lost.',
  },
  {
    title: 'Remaining pot',
    body: 'All money remaining after payouts, including the reserve, stays in the Break & Run pot for future attempts and sessions.',
  },
];

/** Player-facing example under full rules (no operator how-to tips). */
export const USAPL_BREAK_AND_RUN_EXAMPLE =
  'Example: Pot = $500, reserve = $100 → payable $400 → $40 per ball.\nCash out 5 balls + early 10 = $280, then done for this session.\nBust after making 5 = $0 paid; they may rebuy again this session.\nScratch on the break = $0 and rebuy allowed.\n\nReserve: an amount held back from payouts so the pot is not emptied in one run. Leftover pot and reserve carry forward between sessions.\n\nAdministration fee: $1 from each $10 entry and $2 from each $20 entry. That fee does not go into the Break & Run pot.';

/** @deprecated Prefer USAPL_BREAK_AND_RUN_EXAMPLE — kept for older imports. */
export const USAPL_BREAK_AND_RUN_OPERATOR_EXAMPLE = USAPL_BREAK_AND_RUN_EXAMPLE;
export const USAPL_BREAK_AND_RUN_PUBLIC_RULES = USAPL_BREAK_AND_RUN_RULES;

export const USAPL_BREAK_AND_RUN_TAGLINE =
  'Every ball is worth money. \nAfter you make one, you can take the money or keep shooting. \nKeep shooting and miss—you lose it all.';

/** @deprecated */
export const LEGENDS_BREAK_AND_RUN_RULES = USAPL_BREAK_AND_RUN_RULES;
/** @deprecated */
export const LEGENDS_BREAK_AND_RUN_EXAMPLE = USAPL_BREAK_AND_RUN_EXAMPLE;
