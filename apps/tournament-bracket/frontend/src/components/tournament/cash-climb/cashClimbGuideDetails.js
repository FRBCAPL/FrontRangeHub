/**
 * Card details for the King of the Hill guide. Worked examples come from the real payout plan for a sample
 * event; tonight's exact amounts are posted on the board.
 */
import { cashClimbGuideExample } from './cashClimbGuideExample.js';

const usd = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

export function cashClimbGuideDetails() {
  const ex = cashClimbGuideExample();
  const eventName = ex ? `${ex.entrants} players, ${usd(ex.entryFee)} entry` : '';
  const exampleNote = 'Example only. Tonight\u2019s exact amounts are on the board.';
  const rr = ex?.rr || [];
  const sampleNight = rr.length >= 4 ? [
    [`Round 1 win`, usd(rr[0].win)],
    [`Round 2 win`, usd(rr[1].win)],
    [`Round 3 bye`, usd(rr[2].bye)],
    [`Round 4 win`, usd(rr[3].win)],
    ['So far', usd(rr[0].win + rr[1].win + rr[2].bye + rr[3].win)],
  ] : null;
  const rrLadder = rr.length ? {
    title: `Win pay by round (${eventName})`,
    bars: rr.map((r) => ({ label: `Rd ${r.round}`, amount: r.win })),
    note: 'Rounds are the plan for this field. A night can run shorter or longer.',
  } : null;
  const finishRows = ex ? [
    ['Last standing (champion)', `${usd(ex.championship)}*`],
    ['2nd last standing', `about ${usd(ex.podium.second)}`],
    ['3rd last standing', `about ${usd(ex.podium.third)}`],
  ] : null;
  const finishNote = ex
    ? `*If ${ex.koh.length} King of the Hill matches are played: ${usd(ex.kohBudget)} King of the Hill money minus ${usd(ex.kohMatchTotal)} in match pay. 2nd and 3rd split the ${usd(ex.podiumReserve)} held back from round robin (plus any round-robin money not used) 60/40. These prizes are on top of match money already won, and if needed some of 2nd\u2019s leftover moves to the champion so the champion\u2019s night total stays on top. ${exampleNote}`
    : '';

  return {
    buyin: {
      icon: '\u{1F3AF}',
      title: 'Buy in',
      topic: 'What it is',
      summary: 'Pay your entry. All of it stays in this event.',
      lead: 'Pay your entry and you are in. The full entry stays in this event and is paid back to players during the night.',
      points: [
        'You earn money as you win matches, not only at the end.',
        'CSI rules. Call your shots.',
        "The director picks the game: 8-Ball, 9-Ball, 10-Ball, mixed, or lagger's choice.",
      ],
      example: ex ? {
        title: `Example: ${eventName}`,
        rows: [
          ['Prize pool', `${usd(ex.pool)} \u2013 all paid to players`],
          ['Round-robin money', usd(ex.rrBudget)],
          ['King of the Hill money', usd(ex.kohBudget)],
        ],
        note: `${usd(ex.podiumReserve)} of the round-robin money is held back for 2nd and 3rd last standing. ${exampleNote}`,
      } : null,
    },
    roundRobin: {
      icon: '\u{1F501}',
      title: 'Round robin',
      topic: 'Two stages',
      summary: 'Keep playing until you take 3 losses.',
      lead: 'Everyone starts here. You keep getting matches until you take 3 losses.',
      points: [
        'Win pay climbs as the rounds go on.',
        'Round-robin matches are usually 1 game. Check Player rules for tonight\u2019s races.',
        'When 3 or fewer players are left, the tournament switches to King of the Hill.',
      ],
      example: rr.length ? {
        title: `Planned rounds (${eventName})`,
        head: ['Round', 'Matches', 'Win pays', 'Bye pays'],
        rows: rr.map((r) => [`Round ${r.round}`, String(r.matches), usd(r.win), usd(r.bye)]),
        note: `Fewer matches each round as players reach 3 losses. ${exampleNote}`,
      } : null,
    },
    cash: {
      icon: '\u{1F4B5}',
      title: 'Collect your cash',
      topic: 'How you get paid',
      summary: 'Win a match, take its posted cash.',
      lead: 'Every match has a posted dollar amount. Win the match and that cash is yours.',
      points: [
        'Early matches pay less, later matches pay more. That is the climb.',
        'A bye pays about half a match win and does not count as a loss.',
        'Money you win is never taken back if you lose later.',
      ],
      ladder: rrLadder,
      example: sampleNight ? { title: 'Example: one player\u2019s first four rounds', rows: sampleNight, note: exampleNote } : null,
    },
    koth: {
      icon: '\u{1F451}',
      title: 'King of the Hill',
      topic: 'King of the Hill',
      summary: 'Winner stays on. 2 losses and you are out.',
      lead: 'The winner stays on the table and the loser sits down. Take 2 King of the Hill losses and you are out.',
      points: [
        'King of the Hill matches are usually race to 2.',
        'The last player standing is the champion \u2013 who survived longest, not who has the most cash.',
      ],
      example: ex?.koh.length ? {
        title: `King of the Hill match pay (${eventName})`,
        rows: [
          ...ex.koh.map((m) => [`Match ${m.match} win`, usd(m.pay)]),
          ['Left over for the champion', `${usd(ex.championship)}*`],
        ],
        note: `*If ${ex.koh.length} matches are played. Any further match pays ${usd(ex.koh.at(-1).pay)} from that same money. ${exampleNote}`,
      } : null,
    },
    finish: {
      icon: '\u{1F3C1}',
      title: 'The finish',
      topic: 'How the night ends',
      summary: 'Leftover money and the optional chop.',
      lead: 'Leftover King of the Hill money is the championship prize for the last player standing.',
      points: [
        '3rd last standing is paid their leftover when they sit, not at the end.',
        'Leftover round-robin money for 2nd last standing is paid at the end.',
        'The last two may chop the remaining leftover 50/50 instead of playing it out. Match money already won is kept.',
      ],
      example: finishRows ? { title: `Finish prizes (${eventName})`, rows: finishRows, note: finishNote } : null,
    },
    getPaid: {
      icon: '\u{1F4B0}',
      title: 'How do I get paid?',
      topic: 'How you get paid',
      lead: 'Win a match and you take its posted cash right then. Later matches pay more than early ones.',
      points: ['Money you win is yours. It is not taken back if you lose later.'],
      ladder: rrLadder,
    },
    bye: {
      icon: '\u{1F6CB}\u{FE0F}',
      title: 'What does a bye pay?',
      topic: 'How you get paid',
      lead: 'About half of a match win. A bye never counts as a loss.',
      example: rr.length ? {
        title: `Example (${eventName})`,
        head: ['Round', 'Win pays', 'Bye pays'],
        rows: [rr[0], rr[Math.floor(rr.length / 2)], rr.at(-1)].map((r) => [`Round ${r.round}`, usd(r.win), usd(r.bye)]),
        note: exampleNote,
      } : null,
    },
    whoWins: {
      icon: '\u{1F3C6}',
      title: 'Who wins: most cash or last standing?',
      topic: 'Reading the board',
      lead: 'The champion is the last player standing in King of the Hill, not the player with the most cash.',
      points: ['You can be up in cash and still not finish last standing.'],
    },
    chop: {
      icon: '\u{1F91D}',
      title: 'Can the last two players chop?',
      topic: 'How the night ends',
      lead: 'Yes. The last two can split the remaining leftover money 50/50 instead of playing for last standing.',
      points: ['Match money each player already won is kept either way.'],
    },
    houseRules: {
      icon: '\u{1F4DC}',
      title: 'Are there any house rules?',
      topic: 'What it is',
      lead: 'One: no 9 on the break.',
      points: ['If the 9-ball is pocketed on the break, it is spotted and the shooter continues with the table as it lays.'],
    },
    board: {
      icon: '\u{1F4CA}',
      title: 'What do the numbers on the board mean?',
      topic: 'Reading the board',
      lead: 'The number next to a name is cash rank: who has earned the most so far.',
      points: ['Last standing, 2nd last and 3rd last are about who lasted longest in King of the Hill \u2013 a separate thing from cash rank.'],
    },
  };
}
