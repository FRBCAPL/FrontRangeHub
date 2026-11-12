/**
 * Break & Run guide cards: the steps and quick answers open their own detail, with worked examples from the
 * real payout math (the live pot when there is one); the official rules are the full-rules tour.
 */
import { CALLED_BREAK_AND_RUN_RULES } from './breakAndRunCalledRules.js';
import { SEED_FLOOR } from './breakAndRunCalledPayout.js';
import { formatDollars as usd, GUIDE_QUICK_ANSWERS } from './breakAndRunGuide.js';

const RULE_ICONS = ['\u{1F39F}\u{FE0F}', '\u{1F501}', '\u{1F512}', '\u{1F3AF}', '\u{1F340}', '\u{1F4A5}', '\u{1F4E3}', '\u{1F4B5}', '\u{1F51F}', '\u{1F3C6}', '\u{26A0}\u{FE0F}', '\u{1F9D1}\u{200D}\u{2696}\u{FE0F}', '\u{1F4D6}'];

/** Official rules as tour topics: one line per paragraph line, blank lines dropped. */
export function breakAndRunRuleSections(rules = CALLED_BREAK_AND_RUN_RULES) {
  return rules.map((rule, i) => ({
    icon: RULE_ICONS[i] || '\u{1F4D6}',
    title: rule.title,
    body: String(rule.body).split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  }));
}

function exampleRows(item) {
  if (item.bonus > 0) {
    return [['Bank', usd(item.bank)], ['Early 10 bonus', `+${usd(item.bonus)}`], ['Takes home', usd(item.payout)]];
  }
  return [['Bank', usd(item.bank)], ['Takes home', item.payout > 0 ? usd(item.payout) : '$0 \u2013 can rebuy']];
}

export function breakAndRunGuideDetails({ examples, memberFee = 10, openFee = 20, live = false }) {
  const [quick, run, bust, early, final] = examples.items;
  const potLabel = live ? `with the pot right now (${usd(examples.pot)})` : `with a ${usd(examples.pot)} pot`;
  const answer = (q) => GUIDE_QUICK_ANSWERS.find((a) => a.q === q)?.a || '';

  const details = {
    buyin: {
      icon: '\u{1F39F}\u{FE0F}',
      title: 'Buy in at the table',
      topic: 'Entry & rebuys',
      summary: `${usd(memberFee)} members \u00b7 ${usd(openFee)} open. One entry = one attempt.`,
      lead: `One entry buys one attempt. ${usd(memberFee)} for Front Range Pool League members and anyone playing in an event that day, ${usd(openFee)} for everyone else.`,
      points: [
        'Bust with $0? Rebuy as many times as you like \u2013 rebuys go to the end of the line.',
        'Get paid anything and you are done for the session.',
      ],
      example: { title: 'Entry', rows: [['League members / in an event today', usd(memberFee)], ['Everyone else', usd(openFee)]] },
    },
    break: {
      icon: '\u{1F4A5}',
      title: 'Break the rack',
      topic: 'The break',
      summary: `Every ball that drops on the break adds ${usd(examples.luckyBall)}.`,
      lead: `Hit the 1-ball first. Every ball that drops on the break adds ${usd(examples.luckyBall)} (the lucky-ball value) to your bank.`,
      points: [
        'A dry break is fine \u2013 you keep shooting from $0.',
        'The 10 on the break is spotted, pays nothing, and you keep shooting.',
        'A scratch or foul on the break ends the attempt at $0. You can rebuy.',
      ],
      example: { title: `${quick.title} \u00b7 ${potLabel}`, rows: exampleRows(quick), note: quick.setup },
    },
    call: {
      icon: '\u{1F4E3}',
      title: 'Call every shot',
      topic: 'Called shots after the break',
      summary: `Each called ball you make banks ${usd(examples.perBall)}.`,
      lead: `After the break, call the ball and the pocket. Make it and you bank ${usd(examples.perBall)} (the called-ball value).`,
      points: [
        `Extra balls that fall on the same shot add ${usd(examples.luckyBall)} each.`,
        'Miss the called ball and the attempt ends at $0 \u2013 even if other balls fall.',
      ],
      example: {
        title: `One good shot \u00b7 ${potLabel}`,
        rows: [['Called ball made', `+${usd(examples.perBall)}`], ['One extra ball falls', `+${usd(examples.luckyBall)}`], ['Added to your bank', usd(examples.perBall + examples.luckyBall)]],
      },
    },
    cashout: {
      icon: '\u{1F4B0}',
      title: 'Cash out or keep going',
      topic: 'Cash out or continue',
      summary: 'Take your bank home, or risk it for more.',
      lead: 'After any good shot you choose: take your bank home, or keep shooting for more. Keep going and the whole bank is at risk.',
      points: [
        'A miss, scratch or foul drops your bank to $0.',
        'The official asks \u201ccash out or continue?\u201d before each shot once you have money banked. Starting the next shot means you continued.',
      ],
      example: {
        title: `Same run, two endings \u00b7 ${potLabel}`,
        head: ['', 'Bank', 'Takes home'],
        rows: [[`${run.title}: cash out`, usd(run.bank), usd(run.payout)], [`${bust.title}: miss the next shot`, usd(bust.bank), '$0']],
        note: run.setup,
      },
    },
    tenball: {
      icon: '\u{1F3C6}',
      title: 'Run the rack, win the pot',
      topic: 'Final 10 \u2014 WIN THE POT',
      summary: 'Early 10 pays a bonus. The Final 10 wins it all.',
      lead: 'Call the 10 early and make it: your bank plus 25% of what\u2019s left. Clear the table and sink the Final 10: you win the entire pot.',
      points: ['An Early 10 is an automatic cash-out and cannot win the whole pot.'],
      example: {
        title: `The 10-ball \u00b7 ${potLabel}`,
        head: ['', 'Bank', 'Bonus', 'Takes home'],
        rows: [[early.title, usd(early.bank), `+${usd(early.bonus)}`, usd(early.payout)], [final.title, '\u2013', '\u2013', usd(final.payout)]],
        note: `${early.title}: ${early.setup} ${final.title}: ${final.setup}`,
      },
    },
    miss: {
      icon: '\u{274C}',
      title: 'What happens if I miss?',
      topic: 'Cash out or continue',
      lead: answer('What happens if I miss?'),
      example: { title: `${bust.title} \u00b7 ${potLabel}`, rows: exampleRows(bust), note: bust.setup },
    },
    again: {
      icon: '\u{1F501}',
      title: 'Can I play again after I get paid?',
      topic: 'Entry & rebuys',
      lead: answer('Can I play again after I get paid?'),
    },
    pot: {
      icon: '\u{1F3E6}',
      title: 'Where does the pot come from?',
      topic: 'Continuous pot & sessions',
      lead: answer('Where does the pot come from?'),
      points: [`If someone wins the whole pot, it is re-seeded to ${usd(SEED_FLOOR)} for the next attempt.`],
    },
    tenOnBreak: {
      icon: '\u{1F51F}',
      title: 'What if the 10 goes in on the break?',
      topic: 'The break',
      lead: answer('What if the 10 goes in on the break?'),
    },
    tenAccident: {
      icon: '\u{26A0}\u{FE0F}',
      title: 'What if the 10 falls by accident?',
      topic: 'Accidental 10-ball',
      lead: answer('What if the 10 falls by accident?'),
    },
    calls: {
      icon: '\u{1F9D1}\u{200D}\u{2696}\u{FE0F}',
      title: 'Who makes the calls?',
      topic: 'Referee & player decisions',
      lead: answer('Who makes the calls?'),
    },
  };

  return {
    details,
    journey: [
      { detail: 'buyin', label: 'Buy in at the table' },
      { detail: 'break', label: 'Break the rack', money: 1 },
      { detail: 'call', label: 'Call every shot', money: 2 },
      { detail: 'cashout', label: 'Cash out or keep going', money: 3 },
      { detail: 'tenball', label: 'Run the rack, win the pot', money: 5 },
    ],
    faq: [
      { q: 'What happens if I miss?', detail: 'miss' },
      { q: 'Can I play again after I get paid?', detail: 'again' },
      { q: 'Where does the pot come from?', detail: 'pot' },
      { q: 'What if the 10 goes in on the break?', detail: 'tenOnBreak' },
      { q: 'What if the 10 falls by accident?', detail: 'tenAccident' },
      { q: 'Who makes the calls?', detail: 'calls' },
    ],
  };
}
