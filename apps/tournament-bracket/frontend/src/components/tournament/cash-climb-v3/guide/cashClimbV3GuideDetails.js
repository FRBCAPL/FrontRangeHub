/**
 * Card details for the Cash Climb guide: what each step means for a player, with a worked example from
 * the payout engine. Example numbers are labelled as an example; each event's real amounts are on its payout table.
 */
import { cashClimbV3GuideExample } from './cashClimbV3GuideExample.js';

const usd = (n) => `$${n}`;

export function cashClimbV3GuideDetails({ split }) {
  const ex = cashClimbV3GuideExample();
  const eventName = ex ? `${ex.entrants} players, ${usd(ex.entryFee)} entry, race to ${ex.raceTo}` : '';
  const exampleNote = 'Example only. Your event\u2019s exact amounts are on its payout table.';
  const [quarter, semi] = ex ? ex.later : [];
  const shutout = ex?.opening[0];
  const mid = ex?.opening[2];
  const championNight = ex ? mid.winner + quarter.amount + semi.amount + ex.final.champion : 0;

  const climbLadder = ex ? {
    title: `Pay for each win (${eventName})`,
    bars: ex.later.map((r) => ({ label: r.name === 'Championship' ? 'Final' : r.name, amount: r.amount })),
    note: `The final\u2019s amount is split ${split.champion}/${split.runnerUp} between the two players in it.`,
  } : null;

  return {
    signup: {
      icon: '\u{1F3AF}',
      title: 'Sign up',
      topic: 'How it works',
      summary: 'Pay your entry and get a random spot in the bracket.',
      lead: 'Random draw bracket.\nSingle elimination.\nEvery dollar you win along the way is yours to keep.',
      center: true,
      points: [
        'All the entry money goes back to the players.',
        'Every match is a race to the same number of racks. The director tells you the race before you start.',
      ],
      example: ex ? {
        title: `Example: ${eventName}`,
        rows: [
          ['Players', String(ex.entrants)],
          ['Entry fee', usd(ex.entryFee)],
          ['Prize money', `${usd(ex.prizePool)} \u2013 all paid to players`],
          ['First matches', `${ex.openingMatches} matches, every player paid`],
        ],
        note: exampleNote,
      } : null,
    },
    opening: {
      icon: '\u{1F4B5}',
      title: 'Your first match',
      topic: 'Your first match',
      summary: 'It pays you, win or lose.',
      lead: 'Win or lose, you get paid.\nLose a close one and you still earn for every rack you won.',
      points: [
        'Win and you get the bigger share.',
        'Win without losing a rack and you get your whole entry fee back.',
      ],
      example: ex ? {
        title: `What each score pays (${eventName})`,
        head: ['Score', 'Winner', 'Loser'],
        rows: ex.opening.map((r) => [r.score, usd(r.winner), usd(r.loser)]),
        note: `${shutout.score} is a shutout: the winner gets the ${usd(ex.entryFee)} entry back. ${exampleNote}`,
      } : null,
    },
    climb: {
      icon: '\u{1F4C8}',
      title: 'Keep winning',
      topic: 'Keep winning',
      summary: 'Every win pays more than the last.',
      lead: 'From your second match on, only the winner gets paid, and each win pays more than the one before.',
      points: [
        'Lose and you are out, but you keep everything you have won.',
        'The amounts are set before the first match and never change.',
      ],
      ladder: climbLadder,
      example: ex ? {
        title: 'Example run to the final',
        rows: [
          [`First match, win ${mid.score}`, usd(mid.winner)],
          ['Quarterfinal win', usd(quarter.amount)],
          ['Semifinal win', usd(semi.amount)],
          ['Before the final', usd(mid.winner + quarter.amount + semi.amount)],
        ],
        note: exampleNote,
      } : null,
    },
    championship: {
      icon: '\u{1F3C6}',
      title: 'The final',
      topic: 'The final',
      summary: 'The biggest payday of the night.',
      lead: `Win the final and you take ${split.champion}% of the biggest prize of the night. The runner-up takes ${split.runnerUp}%.`,
      points: [
        'Any money left over from earlier in the night is added on top as a bonus, split the same way.',
        'If the final is not played, there is no bonus.',
      ],
      example: ex ? {
        title: `Example final (${eventName})`,
        rows: [
          ['Final prize', usd(ex.final.allocation)],
          ['Champion', usd(ex.final.champion)],
          ['Runner-up', usd(ex.final.runnerUp)],
          [`Champion\u2019s whole night (first match won ${mid.score})`, `${usd(championNight)} + any bonus`],
        ],
        note: exampleNote,
      } : null,
    },
    preliminary: {
      icon: '\u{1F39F}\u{FE0F}',
      title: 'Why do some players play an extra match?',
      topic: 'Extra match to get in',
      lead: 'A full bracket needs 8, 16, 32 players and so on. When the number of players does not fit, a few players (picked by the draw) play one extra match to get in.',
      points: [
        'It pays like a first match, at half the amounts.',
        'Win it and your next match pays like everyone else\u2019s first match.',
        'Everyone else starts with their first match.',
      ],
      example: ex ? {
        title: `Example: ${ex.prelimShape.entrants} players, ${usd(ex.entryFee)} entry`,
        head: ['Score', 'Winner', 'Loser'],
        rows: ex.preliminary.map((r) => [r.score, usd(r.winner), usd(r.loser)]),
        note: `${ex.prelimShape.preliminaryMatches * 2} players play ${ex.prelimShape.preliminaryMatches} extra matches; ${ex.prelimShape.preliminaryByes} go straight into the bracket. ${exampleNote}`,
      } : null,
    },
    pay: {
      icon: '\u{1F4B0}',
      title: 'How much does each match pay?',
      topic: 'Keep winning',
      lead: 'Your first match pays by the score, win or lose. After that, each win pays a set amount that grows every round. Your event\u2019s exact amounts are on its payout table.',
      example: ex ? {
        title: `First match (${eventName})`,
        head: ['Score', 'Winner', 'Loser'],
        rows: ex.opening.map((r) => [r.score, usd(r.winner), usd(r.loser)]),
      } : null,
      ladder: climbLadder,
    },
    shutout: {
      icon: '\u{1F947}',
      title: 'What is the shutout bonus?',
      topic: 'Your first match',
      lead: 'Win your first match without losing a rack and you get your full entry fee back.',
      points: [
        'In an extra match to get into the bracket, it pays half that.',
        'It only applies to first matches and extra matches.',
      ],
      example: ex ? {
        title: `Example: ${usd(ex.entryFee)} entry, race to ${ex.raceTo}`,
        rows: [
          [`First match, win ${shutout.score}`, usd(shutout.winner)],
          [`Extra match, win ${ex.preliminary[0].score}`, usd(ex.preliminary[0].winner)],
        ],
      } : null,
    },
    forfeit: {
      icon: '\u{26A0}\u{FE0F}',
      title: 'What if my opponent does not show?',
      topic: 'No-shows and quitting',
      lead: 'You move on and get half of what that match pays.',
      points: [
        'In the final, you get half of the champion\u2019s share.',
        'If your opponent quits partway through your first match, you both keep what you earned for racks won.',
        'Later in the bracket, if your opponent quits, you just move on.',
      ],
      example: ex ? {
        title: `Example no-shows (${eventName})`,
        head: ['Round', 'Normal win', 'No-show win'],
        rows: [
          ['Quarterfinal', usd(quarter.amount), usd(ex.half(quarter.amount))],
          ['Semifinal', usd(semi.amount), usd(ex.half(semi.amount))],
          ['Final', usd(ex.final.champion), usd(ex.half(ex.final.champion))],
        ],
        note: exampleNote,
      } : null,
    },
    keep: {
      icon: '\u{1F512}',
      title: 'Can I lose money I already won?',
      topic: 'Good to know',
      lead: 'No. Money you win is yours. It is never taken back if you lose later.',
      example: ex ? {
        title: 'Example',
        rows: [
          [`Win your first match ${mid.score}`, `+${usd(mid.winner)}`],
          ['Lose your next match', '+$0'],
          ['You go home with', usd(mid.winner)],
        ],
      } : null,
    },
    scores: {
      icon: '\u{1F4CB}',
      title: 'Who enters the scores?',
      topic: 'Good to know',
      lead: 'The tournament director enters every result. Just tell them the score when your match ends.',
    },
  };
}
