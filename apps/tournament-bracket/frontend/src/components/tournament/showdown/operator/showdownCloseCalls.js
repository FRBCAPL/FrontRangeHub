/** Plain-English explanations of close decisions at the playoff cutoff and the last bye. */
import { TIEBREAKERS, tiebreakerLabel } from '../showdownRules.js';

const VALUE_KEYS = TIEBREAKERS.map((t) => t.key).filter((k) => k !== 'headToHead');
const signed = (n) => (n > 0 ? `+${n}` : String(n));
const VALUE = {
  matchWins: (r) => String(r.matchWins),
  gamesWon: (r) => String(r.gamesWon),
  gamesLost: (r) => String(r.gamesLost),
  oppMatchWins: (r) => String(r.oppMatchWins),
  oppGameDiff: (r) => signed(r.oppGameDiff),
};
const SHARED = { matchWins: 'wins', gamesWon: 'games won', gamesLost: 'games lost', oppMatchWins: 'opponents\u2019 match wins', oppGameDiff: 'opponents\u2019 game differential' };

function listText(items) {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function ordinal(n) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${suffix}`;
}

const placeText = (r) => `${r.tied ? 'tied ' : ''}${ordinal(r.rank)}`;

/** "Player 14’s opponents (Player 9 and Player 3) won 3 matches between them" — names who the opponents were. */
function opponentsText(rows, r, key) {
  const names = (r.opponents || []).map((id) => rows.find((x) => x.playerId === id)?.name || id);
  const who = `${r.name}\u2019s opponents${names.length ? ` (${listText(names)})` : ''}`;
  if (key === 'oppMatchWins') return `${who} won ${r.oppMatchWins} ${r.oppMatchWins === 1 ? 'match' : 'matches'} between them`;
  return `${who} have a combined game differential of ${signed(r.oppGameDiff)}`;
}

function headToHeadText(state, a, b) {
  const m = (state.matches || []).find((x) => x.phase === 'qualifying' && x.status === 'completed' && x.winnerId
    && ((x.p1 === a.playerId && x.p2 === b.playerId) || (x.p1 === b.playerId && x.p2 === a.playerId)));
  if (!m) return '';
  const winner = m.winnerId === a.playerId ? a : b;
  const loser = winner === a ? b : a;
  const [w, l] = m.p1 === winner.playerId ? [m.score1, m.score2] : [m.score2, m.score1];
  return `${winner.name} beat ${loser.name} ${w}\u2013${l}`;
}

/** The criterion that put `above` ahead of `below`; null when they are still statistically tied. */
function deciderBetween(rows, above, below) {
  if (above.rank === below.rank) return null;
  const ia = rows.indexOf(above);
  if (rows.indexOf(below) === ia + 1 && below.separatedBy) return below.separatedBy;
  return VALUE_KEYS.find((k) => VALUE[k](above) !== VALUE[k](below)) || null;
}

function explain(state, rows, above, below, kind, locked) {
  const key = deciderBetween(rows, above, below);
  if (key === 'matchWins') return null;
  const stopAt = key ? TIEBREAKERS.findIndex((t) => t.key === key) : TIEBREAKERS.length;
  const shared = VALUE_KEYS
    .filter((k) => TIEBREAKERS.findIndex((t) => t.key === k) < stopAt)
    .map((k) => `${SHARED[k]} (${VALUE[k](above)})`);
  const what = kind === 'bye' ? 'the last quarterfinal bye' : 'the last playoff spot';
  let decided;
  if (!key) decided = `Tied on all six tiebreakers, so the ${kind === 'bye' ? 'bye' : 'qualification'} shootout decided it.`;
  else if (key === 'headToHead') decided = `Decided by head-to-head: ${headToHeadText(state, above, below)}.`;
  else if (key === 'oppMatchWins' || key === 'oppGameDiff') {
    decided = `Decided by ${tiebreakerLabel(key).toLowerCase()}: ${opponentsText(rows, above, key)}; ${opponentsText(rows, below, key)}.`;
  } else decided = `Decided by ${tiebreakerLabel(key).toLowerCase()}: ${VALUE[key](above)} to ${VALUE[key](below)}.`;
  return {
    kind,
    criterion: key,
    aboveId: above.playerId,
    belowId: below.playerId,
    title: kind === 'bye' ? 'Last bye' : 'Playoff cutoff',
    text: `${above.name} (${placeText(above)}) ${locked ? 'got' : 'holds'} ${what} ahead of ${below.name} (${placeText(below)}). Tied on ${listText(shared)}. ${decided}`,
  };
}

/**
 * Close calls for the standings screens: the last player in vs the first eligible player out, and
 * (once byes are known) the last bye holder vs the first qualifier without one. A call is listed
 * only when the two players have the same match wins, or a shootout separated them.
 */
export function closeCalls(state, rows) {
  const calls = [];
  const locked = Boolean(state.qualification);
  const lastOf = (pred) => [...rows].reverse().find(pred);
  const firstOf = (pred) => rows.find(pred);
  const lastIn = lastOf((r) => r.status === 'qualified');
  const firstOut = firstOf((r) => r.status === 'out');
  if (lastIn && firstOut && !rows.some((r) => r.status === 'tied')) calls.push(explain(state, rows, lastIn, firstOut, 'cutoff', locked));
  const lastBye = lastOf((r) => r.bye);
  const firstNoBye = firstOf((r) => r.status === 'qualified' && !r.bye);
  if (lastBye && firstNoBye && !state.qualification?.byeTie) calls.push(explain(state, rows, lastBye, firstNoBye, 'bye', locked));
  return calls.filter(Boolean);
}
