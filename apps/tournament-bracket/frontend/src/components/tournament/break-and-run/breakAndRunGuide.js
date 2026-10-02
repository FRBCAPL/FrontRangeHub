import { fromCents, toCents } from './breakAndRunMath.js';
import { calledBallValues, calledTurnPayoutCents, SEED_FLOOR } from './breakAndRunCalledPayout.js';

/** "$50" for whole amounts, "$12.50" otherwise — payouts are whole dollars, so cents are noise here. */
export function formatDollars(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const formatMoney = formatDollars;

export const BREAK_AND_RUN_GUIDE_HASH = '/tournament-bracket/break-and-run/how-it-works';
/** Short link for flyers and texts; App.jsx forwards it to the hash route. */
export const BREAK_AND_RUN_GUIDE_SHORT_PATH = '/break-and-run';
export const GUIDE_EXAMPLE_POT = 500;

export function isBreakAndRunGuidePath(pathname) {
  return String(pathname || '') === BREAK_AND_RUN_GUIDE_HASH;
}

/** Hash link works on every domain without a server rewrite, so it's what Share copies. */
export function breakAndRunGuideHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${BREAK_AND_RUN_GUIDE_HASH}`;
}

export function guideSteps({ memberFee = 10, openFee = 20, perBall = 50, luckyBall = 10 } = {}) {
  return [
    {
      title: 'Buy in at the table',
      body: `${formatMoney(memberFee)} for Front Range Pool League members and anyone playing in an event that day. ${formatMoney(openFee)} for everyone else. One entry = one attempt.`,
    },
    {
      title: 'Break the rack',
      body: `Hit the 1-ball first. Every ball that drops on the break adds ${formatMoney(luckyBall)} (the lucky-ball value) to your bank. A dry break is fine — you keep shooting from $0.`,
    },
    {
      title: 'Call every shot',
      body: `After the break, call the ball and pocket. Make it and you bank ${formatMoney(perBall)} (the called-ball value). Extra balls that fall on the same shot add ${formatMoney(luckyBall)} each.`,
    },
    {
      title: 'Cash out or keep going',
      body: 'After any good shot you choose: take your bank home, or keep shooting for more. Keep going and the whole bank is at risk — a miss, scratch, or foul drops it to $0.',
    },
    {
      title: 'Run the rack, win the pot',
      body: 'Call the 10 early and make it: your bank plus a 25% bonus of what’s left. Clear the table and sink the Final 10: you win the entire pot.',
    },
  ];
}

export const GUIDE_QUICK_ANSWERS = [
  {
    q: 'What happens if I miss?',
    a: 'Your attempt ends and your bank goes to $0. You can buy in again — rebuys go to the end of the line.',
  },
  {
    q: 'Can I play again after I get paid?',
    a: 'Not that session. Get paid = you’re done for the night. $0 = you can rebuy as many times as you like.',
  },
  {
    q: 'Where does the pot come from?',
    a: `Entries (minus a small admin fee) go into the pot. It carries over from night to night and venue to venue, and the league tops it up so it never starts below ${formatMoney(SEED_FLOOR)}.`,
  },
  {
    q: 'What if the 10 goes in on the break?',
    a: 'It gets spotted, pays nothing, and you keep shooting.',
  },
  {
    q: 'What if the 10 falls by accident?',
    a: 'If your called ball went in, the 10 is spotted and you keep going. If you missed your called ball, the attempt is over.',
  },
  {
    q: 'Who makes the calls?',
    a: 'A league official watches every attempt, asks “cash out or continue?” before each shot once you have money banked, and their ruling is final.',
  },
];

function example(potCents, { title, setup, outcome, calledBalls = 0, breakBalls = 0, extraBalls = 0, tone }) {
  const result = calledTurnPayoutCents({ potCents, outcome, calledBalls, breakBalls, extraBalls });
  return {
    title,
    setup,
    bank: fromCents(result.bankCents),
    bonus: fromCents(result.earlyTenBonusCents),
    payout: fromCents(result.payoutCents),
    tone,
  };
}

/** Worked examples from the real payout math, using the live pot when there is one. */
export function guideExamples(pot = GUIDE_EXAMPLE_POT) {
  const amount = Number(pot) > 0 ? Number(pot) : GUIDE_EXAMPLE_POT;
  const potCents = toCents(amount);
  const values = calledBallValues(potCents);
  const perBall = fromCents(values.normalCents);
  const luckyBall = fromCents(values.luckyCents);
  const ball = (n, value) => `${n} × ${formatMoney(value)}`;

  const items = [
    example(potCents, {
      title: 'Quick cash',
      setup: `Two balls drop on the break (${ball(2, luckyBall)}). You cash out.`,
      outcome: 'cash-out',
      breakBalls: 2,
      tone: 'win',
    }),
    example(potCents, {
      title: 'Good run',
      setup: `One on the break (${formatMoney(luckyBall)}), then three called balls (${ball(3, perBall)}). You cash out.`,
      outcome: 'cash-out',
      breakBalls: 1,
      calledBalls: 3,
      tone: 'win',
    }),
    example(potCents, {
      title: 'Pushed your luck',
      setup: 'Same good run, but you keep going and miss the next called shot.',
      outcome: 'bust',
      breakBalls: 1,
      calledBalls: 3,
      tone: 'bust',
    }),
    example(potCents, {
      title: 'Early 10',
      setup: `One on the break and two called balls, then you call the 10 and make it with balls still on the table.`,
      outcome: 'early-ten',
      breakBalls: 1,
      calledBalls: 2,
      tone: 'win',
    }),
    example(potCents, {
      title: 'Final 10',
      setup: 'You clear the table and make the 10 as the last ball.',
      outcome: 'final-ten',
      tone: 'jackpot',
    }),
  ];

  return { pot: fromCents(values.payableCents), perBall, luckyBall, items };
}
