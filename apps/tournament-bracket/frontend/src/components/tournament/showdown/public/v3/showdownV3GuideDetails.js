/**
 * Card details for the Showdown guide. Procedure only (the game and its playing rules belong to the
 * tournament director). Worked examples come from the plan a new event would lock; each event page has its
 * own exact amounts.
 */
import { showdownV3GuideExample } from './showdownV3GuideExample.js';

export function showdownV3GuideDetails({ copy, tiebreakers, d10 }) {
  const ex = showdownV3GuideExample({ d10 });
  const usd = ex?.usd || ((c) => `$${c / 100}`);
  const eventName = ex ? `${ex.entrants} players, ${usd(ex.entryFee * 100)} entry` : '';
  const exampleNote = 'Example only. Your event page has the exact amounts.';
  const k = ex?.playoffRaceTo;
  const lose = k ? k - 2 : 0;
  const cq = ex?.closeQualifier;
  const quarter = ex?.rounds.find((r) => r.key === 'quarterfinal');
  const finalRound = ex?.rounds.find((r) => r.key === 'final');

  const payRows = ex ? [
    ['Qualifying', usd(ex.gameCents)],
    ...ex.rounds.map((r) => [r.name, usd(r.gameCents)]),
  ] : null;

  return {
    qualifying: {
      icon: '\u{1F3B1}',
      title: 'Qualifying',
      topic: 'Qualifying',
      summary: 'Two matches. Every game you win pays.',
      lead: 'You play two matches against opponents drawn at random. Every game is played, and every game you win pays you \u2013 win or lose the match.',
      points: [
        'Qualifying matches are a set number of games, not a race.',
        'With an even number of games, a match can end in a tie.',
        'Your qualifying dollars decide whether you make the playoffs.',
      ],
      example: ex ? {
        title: `Example: ${usd(ex.gameCents)} per game won (${ex.qualifyingGames} games a match)`,
        head: ['Result', 'Winner', 'Loser'],
        rows: [
          [`${cq.score}`, usd(cq.won * ex.gameCents), usd(cq.lost * ex.gameCents)],
          [`${ex.qualifyingGames}\u20130`, usd(ex.qualifyingGames * ex.gameCents), '$0'],
        ],
        note: `Win ${cq.won} games in each match and you leave qualifying with ${usd(cq.won * 2 * ex.gameCents)}. ${exampleNote}`,
      } : null,
    },
    cut: {
      icon: '\u{1F3AF}',
      title: 'Make the playoffs',
      topic: 'Qualifying',
      summary: 'The top earners in qualifying move on.',
      lead: 'The players who earn the most in qualifying make the playoffs. How many make it depends on how many entered.',
      points: [
        `Tied in the standings? It comes down to ${tiebreakers}.`,
        'Still tied for the last playoff spot or a bye? A shootout settles it.',
        'The top qualifiers can skip the first playoff round with a bye.',
      ],
      example: ex ? {
        title: 'Who makes the playoffs',
        head: ['Players', 'Qualify', 'Byes'],
        rows: ex.fieldTable.map((r) => [r.entrants, String(r.qualifiers), r.byes ? String(r.byes) : '\u2013']),
        note: `With ${ex.entrants} players, ${ex.qualifiers} make the playoffs and ${ex.byes === 1 ? 'the top qualifier gets a bye' : `the top ${ex.byes} get byes`}.`,
      } : null,
    },
    playoffs: {
      icon: '\u{1F94A}',
      title: 'Playoffs',
      topic: 'Playoffs',
      summary: ex?.escalating ? 'One loss and you are out. Games pay more each round.' : 'One loss and you are out. Wins add a bonus.',
      lead: `Playoff matches are races. Lose and you are out. ${copy.playoffsTv}`,
      points: copy.playoffs,
      example: ex ? {
        title: `Example: a ${k}\u2013${lose} playoff match, race to ${k} (${eventName})`,
        head: ex.escalating ? ['Round', 'Per game', 'Winner', 'Loser'] : ['Round', 'Per game', 'Winner (+ bonus)', 'Loser'],
        rows: ex.rounds.map((r) => [
          r.name,
          usd(r.gameCents),
          usd(k * r.gameCents + r.winCents),
          usd(lose * r.gameCents),
        ]),
        note: exampleNote,
      } : null,
      ladder: ex?.escalating ? {
        title: 'Pay per game won',
        bars: [{ label: 'Qualifying', amount: ex.gameCents / 100, display: usd(ex.gameCents) }, ...ex.rounds.map((r) => ({ label: r.name, amount: r.gameCents / 100, display: usd(r.gameCents) }))],
      } : null,
    },
    champion: {
      icon: '\u{1F3C6}',
      title: ex?.escalating ? 'The Champion Fund' : 'The champion',
      topic: 'Good to know',
      summary: ex?.escalating ? 'The champion takes the fund and earns the most.' : 'Leftover playoff money goes to the champion.',
      lead: copy.leftover,
      example: ex?.escalating ? {
        title: `Example (${eventName})`,
        rows: [
          ['Champion Fund at the start', usd(ex.championFundCents)],
          [`A ${k}\u20130 final adds ${ex.maxPlayoffGames - k} unplayed games \u00d7 ${usd(finalRound.gameCents)}`, `+${usd((ex.maxPlayoffGames - k) * finalRound.gameCents)}`],
        ],
        note: `A playoff race to ${k} can run up to ${ex.maxPlayoffGames} games; every game not played adds its pay to the fund. ${exampleNote}`,
      } : null,
    },
    pay: {
      icon: '\u{1F4B0}',
      title: 'How much does each game pay?',
      topic: 'The short version',
      lead: ex?.escalating
        ? 'Every game you win pays, win or lose the match, and each playoff round pays more per game.'
        : 'Every game you win pays the same amount, win or lose the match. Playoff match winners also collect a bonus.',
      example: payRows ? { title: `Per game won (${eventName})`, head: ['Stage', 'Per game'], rows: payRows, note: exampleNote } : null,
    },
    tie: {
      icon: '\u{1F91D}',
      title: 'Can a qualifying match end in a tie?',
      topic: 'Qualifying',
      lead: 'Yes, when the match has an even number of games. Every game is played, so a 6-game match can end 3\u20133.',
      points: ['Both players are paid for every game they won.'],
    },
    bye: {
      icon: '\u{1F3AB}',
      title: ex?.escalating ? 'What is a bye credit?' : 'What does a bye pay?',
      topic: 'Playoffs',
      lead: ex?.escalating
        ? 'With 5\u20137 players in the playoffs, the top qualifiers skip the first round and get a bye credit: half of a full quarterfinal win. It is money, but it is not a game won.'
        : 'With 5\u20137 players in the playoffs, the top qualifiers skip the first round and get half a first-round bonus for the bye.',
      example: ex && quarter ? {
        title: `Example (${eventName})`,
        rows: [
          [`Full quarterfinal win (${k} games \u00d7 ${usd(quarter.gameCents)}${quarter.winCents ? ' + bonus' : ''})`, usd(k * quarter.gameCents + quarter.winCents)],
          ['Bye', usd(ex.byeCents)],
        ],
        note: exampleNote,
      } : null,
    },
    noshow: {
      icon: '\u{26A0}\u{FE0F}',
      title: 'What if my opponent does not show?',
      topic: 'Good to know',
      lead: 'In qualifying, you still get paid for those games.',
    },
    standingsTies: {
      icon: '\u{2696}\u{FE0F}',
      title: 'How are ties in the standings settled?',
      topic: 'Good to know',
      lead: `It comes down to ${tiebreakers}.`,
      points: ['Still tied for the last playoff spot or a bye? A shootout settles it.'],
    },
    phone: {
      icon: '\u{1F4F1}',
      title: 'How do I send in my scores?',
      topic: 'On your phone',
      lead: 'Open the event on your phone. The bracket and money are live, and you can send in your scores there.',
      points: ['The tournament director must approve every score.'],
    },
    cutShort: {
      icon: '\u{23F8}\u{FE0F}',
      title: 'What if the event is cut short?',
      topic: 'Good to know',
      lead: 'Everyone keeps what they have earned, and the rest is split among the players still in it.',
    },
  };
}
