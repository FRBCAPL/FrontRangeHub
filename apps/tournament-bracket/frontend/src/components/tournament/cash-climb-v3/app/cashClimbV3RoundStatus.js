/**
 * Which round is being played and how far each round has got, for the live round banner. Display only:
 * a round is done when none of its matches is still open; the current round is the first one not done.
 */
import { bracketRounds } from './cashClimbV3View.js';

/**
 * Colour family for a round, counted back from the championship: 'championship', 'semifinal',
 * 'quarterfinal', else 'early' (preliminary, opening and any earlier later round).
 */
export function roundTone(rounds, index) {
  const r = rounds[index];
  if (!r || r.key === 'preliminary' || r.key === 'opening') return 'early';
  const fromEnd = rounds.length - 1 - index;
  return ['championship', 'semifinal', 'quarterfinal'][fromEnd] || 'early';
}

/** Every round in play order with { key, label, tone, total, done, state: 'done' | 'current' | 'upcoming' }. */
export function roundProgress(event) {
  const rounds = bracketRounds(event);
  let currentFound = false;
  return rounds.map((r, i) => {
    const done = r.matchIds.filter((id) => event.matches[id].status !== 'open').length;
    const finished = done === r.matchIds.length;
    let state = 'upcoming';
    if (finished) state = 'done';
    else if (!currentFound) { state = 'current'; currentFound = true; }
    return { key: r.key, label: r.label, tone: roundTone(rounds, i), total: r.matchIds.length, done, state, matchIds: r.matchIds };
  });
}

export const currentRound = (progress) => progress.find((r) => r.state === 'current') || null;

/** matchId → { label, tone } for the round each match belongs to. */
export function roundOfMatch(progress) {
  const out = new Map();
  progress.forEach((r) => r.matchIds.forEach((id) => out.set(id, { label: r.label, tone: r.tone })));
  return out;
}
