import { formatMoney } from './breakAndRunMath.js';

export const CALLED_RULES_TAGLINE =
  'Called balls pay full value. Break/Lucky balls pay discounted value. \n'
  + 'Cash out or risk it all and keep shooting. Miss or foul and your bank goes to $0.\n'
  + 'Call the 10 early and make it: Win your bank + early ten bonus\n'
  + 'Clear the rack and make the Final 10: WIN THE POT.';

/** Short table-sign cards for public boards (live values filled in by calledBasicRules). */
const CALLED_BASIC_RULES = [
  {
    title: 'Entry',
    body: 'Front Range Pool League members & players in an event that day · member rate.\nEveryone else · open rate.\nOne attempt per entry.\n$0 = you can rebuy (end of the line). Get paid = you’re done this session.',
  },
  {
    title: 'Called balls pay full',
    body: 'Call ball & pocket after the break.\nEach called ball made pays called-ball amount.\nBreak balls and extra balls that drop pay lucky-ball amount.',
  },
  {
    title: 'Cash out or keep shooting',
    body: 'After a good shot, cash out or continue.\nContinue and your whole bank is at risk.\nMiss, scratch, or foul — bank goes to $0.',
  },
  {
    title: 'The 10-ball',
    body: 'Called early 10: bank + 25% of what’s left (early-10 amount from a $0 bank).\nFinal 10 — last ball on the table: WIN THE POT (final-10 amount).',
  },
];

export function calledBasicRules({
  memberFee = 10,
  openFee = 20,
  perBall = 0,
  luckyBall = 0,
  earlyTenPays = 0,
  finalTenPays = 0,
} = {}) {
  const swaps = [
    [/member rate/gi, formatMoney(memberFee)],
    [/open rate/gi, formatMoney(openFee)],
    [/called-ball amount/gi, formatMoney(perBall)],
    [/lucky-ball amount/gi, formatMoney(luckyBall)],
    [/early-10 amount/gi, formatMoney(earlyTenPays)],
    [/final-10 amount/gi, formatMoney(finalTenPays)],
  ];
  return CALLED_BASIC_RULES.map((rule) => ({
    ...rule,
    body: swaps.reduce((text, [pattern, value]) => text.replace(pattern, value), rule.body),
  }));
}

/** Official rules — working version (player-facing). */
export const CALLED_BREAK_AND_RUN_RULES = [
  {
    title: 'Entry & rebuys',
    body: 'Entry:\n'
      + '$10 per attempt: Front Range Pool League members or players entered in an event that day.\n'
      + '$20 per attempt: Open entry for everyone else.\n'
      + 'Each entry purchases one attempt. \nYou pay for one attempt at a time.\n\n'
      + 'If an attempt results in a $0 payout, the player may rebuy. \nRebuys are unlimited as long as the immediately preceding attempt paid $0. \nA rebuy goes to the end of the line.\n\n'
      + 'Once a player cashes out and receives any payout, that player is finished for the session.\n'
      + 'Simple version: $0 = you can rebuy. Get paid = you’re done.',
  },
  {
    title: 'Continuous pot & sessions',
    body: 'The Break & Run is one continuous pot across nights and venues. \nA session is one play window, usually a night or event.\n'
      + 'Money left after payouts carries forward to the next attempt and session.\n'
      + 'Front Range Pool League adds seed money so the pot is never below $100.',
  },
  {
    title: 'The pot & locked values',
    body: 'The whole pot is in play — nothing is held back. Payouts use whole dollars only.\n'
      + 'Before each attempt: the entry/rebuy is collected, the admin fee is removed, the rest is added to the pot, and all payout values are locked for that attempt.\n'
      + 'Entries or rebuys received after an attempt begins affects future attempts only.\n'
      + 'Any payout is deducted from the pot. The remaining balance carries forward.',
  },
  {
    title: 'Normal (called) ball value',
    body: 'Normal Ball Value = Pot ÷ 10, rounded down to the nearest whole dollar.\n'
      + 'Examples: $200 → $20 · $500 → $50 · $537 → $53 · $1,000 → $100.',
  },
  {
    title: 'Discounted (lucky) ball value',
    body: '**Lucky Ball: Object balls that drop along with a successfully made called ball.**\n\n'
    + 'Balls pocketed on the break and lucky balls earn the Discounted Ball Value.\n'
    + 'The difference isn’t lost. It stays in the pot, and finishing the run with the Final 10 wins the entire pot.\n'
    +'Discounted Ball Value = 25% of the Normal Ball Value, rounded down to the nearest $5, minimum $5, maximum $20, and never more than the Normal Ball Value.\n'
    + 'Examples (pot → discounted ball): $200 → $5 · $400 → $10 · $600 → $15 · $800 or more → $20.\n'
    
    ,
  },
  {
    title: 'The break',
    body: 'The cue ball must contact the 1-ball first.\n'
      + 'A legal break requires at least one object ball pocketed, or at least four object balls driven to a rail.\n'
      + 'Balls pocketed on the break do not need to be called. \nEach ordinary ball legally pocketed on the break earns one Discounted Ball Value.\n'
      + 'If the 10 is pocketed on an otherwise legal break, it is spotted, earns no payout, and the attempt continues.\n'
      + 'A legal dry break lets the player continue from the layout with $0 banked.\n'
      + 'A scratch or foul on the break ends the attempt at $0 and the player may rebuy.',
  },
  {
    title: 'Called shots after the break',
    body: 'Every shot after the break is call shot.\n Push outs are not permitted.\n'
    + 'Player must call the ball and the pocket before each shot attempt.\n'
    + 'The cue ball must first contact the lowest-numbered ball on the table. \n'
    + 'Combinations and caroms are allowed if the lowest ball is contacted first.\n'
      + 'A successfully pocketed called ordinary ball earns one full Normal Ball Value.\n'
      + 'Additional ordinary balls pocketed on that same successful shot(lucky balls)each earn one Discounted Ball Value and stay down.\n'
      + 'Example ($500 pot): called ball made +$50, one extra ball falls +$10 → $60 added to the bank.\n\n'
      + '**The called ball must be made for any other balls on that shot to pay.**\n'
      +'**If the called ball is missed — even if other balls fall — the attempt ends at $0.**',
  },
  {
    title: 'Cash out or continue',
    body: 'After the player has a positive bank and completes a successful shot or break, they choose CASH OUT or CONTINUE. \nA player may cash out after the break if they earned Discounted Ball Value.\n'
      + 'Cashing out pays the current bank and ends the player’s participation for that session.\n'
      + 'A player with a $0 bank cannot voluntarily end the attempt to get a $0 result and a rebuy. \nIf the attempt is legally alive, play continues.\n'
      + 'Continuing puts the entire bank at risk. Once the next shot begins, the decision to continue is final.\n'
      + 'A missed called shot, scratch, or foul ends the attempt and the bank returns to $0. \nNo payout is made, and the player may rebuy.',
  },
  {
    title: 'Early 10-ball',
    body: 'An Early 10 is a legally called and pocketed 10-ball while one or more other object balls remain on the table. \n'
    + 'It is an automatic cash-out.\n'
      + 'Remaining Pot = Locked Pot − Current Bank. \n'
      + 'Early 10 Bonus = 25% of the Remaining Pot, rounded down to the nearest whole dollar.\n'
      + 'The player receives Current Bank + Early 10 Bonus, and the attempt ends.\n'
      + 'Example: $500 pot, $130 bank → $370 remaining → 25% = $92 → Early 10 pays $222.\n'
      + 'An Early 10 cannot win the entire pot.',
  },
  {
    title: 'Final 10 — WIN THE POT',
    body: 'The Final 10 is the 10-ball when it is the only object ball left on the table.\n'
      + 'If the player legally calls and pockets the Final 10 during the same uninterrupted attempt,\n THE PLAYER WINS THE ENTIRE LOCKED POT (rounded down to the whole dollar).\n'
      + 'Front Range Pool League then re-seeds the pot to $100 for the next attempt.\n'
      + 'Discounted payouts only affect what you can cash out early. They never reduce the jackpot.\n'
      + 'Finish the rack. Make the Final 10. Win the pot.',
  },
  {
    title: 'Accidental 10-ball',
    body: 'The 10 is never an ordinary discounted ball.\n'
      + 'If the called ball is made and the 10 also falls by accident: the called ball and any other qualifying balls pay, the 10 pays nothing and is spotted, and the attempt stays alive (cash out or continue).\n'
      + 'If the 10 falls by accident but the called ball is missed: the attempt ends, the bank returns to $0, no payout is made, and the player may rebuy.',
  },
  {
    title: 'Referee & player decisions',
    body: 'Every attempt is witnessed by a designated Front Range Pool League official/referee, who verifies breaks, called shots, pocketed balls, fouls, payout values, Early 10s, Final 10s, and cash-out decisions.\n'
      + 'With money banked, the official asks before the next shot: “You’re at $___ — cash out or continue?”\n The player must clearly choose before shooting.\n'
      + 'Beginning the next shot means the player chose to continue, and the entire bank is at risk.\n'
      + 'The official’s ruling is final.',
  },
  {
    title: 'Governing rules',
    body: 'The current Official Rules of CueSports International (CSI) govern standard rules of play and fouls except where modified by these Front Range Pool League 10-Ball Break & Run rules.\n'
      + 'These Break & Run rules take precedence wherever they differ.\n'
      + 'Rules that require an opponent or continuation of play after the shooter’s inning ends do not apply.\n'
      + 'Push-outs are not permitted.',
  },
];

export const CALLED_BREAK_AND_RUN_FOOTER =
  'The Front Range Pool League 10-Ball Break & Run is independently operated and administered by Front Range Pool League.';
