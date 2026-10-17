/** Test-only helpers that drive a Showdown event through the public engine API. */
import * as E from './showdownEngine.js';
import { seededRandom } from './showdownRandom.js';

export function operator(seed = 1) {
  const random = seededRandom(seed);
  let tick = 0;
  let ids = 0;
  return () => {
    tick += 1;
    return {
      now: new Date(Date.UTC(2026, 9, 18, 17, 0, tick)).toISOString(),
      by: 'operator@test',
      random,
      newId: (prefix) => { ids += 1; return `${prefix}-${ids}`; },
    };
  };
}

export const names = (n) => Array.from({ length: n }, (_, i) => ({ id: `P${i + 1}`, name: `Player ${i + 1}` }));

export function startedEvent(n, { fee = 20, tables = 5, seed = 1 } = {}) {
  const op = operator(seed);
  let s = E.createShowdown({ name: `Test ${n}`, entryFee: fee, tableCount: tables, players: names(n) }, op());
  s = E.startShowdown(s, op());
  return { s, op };
}

/** Plays every open match through the scheduler. `decide(match, random)` returns [score1, score2]. */
export function playOpen(s, op, phase, decide) {
  let state = s;
  for (let guard = 0; guard < 200; guard += 1) {
    const ready = E.readyMatches(state.matches).filter((m) => m.phase === phase);
    const free = E.freeTables(state.matches, state.settings.tableCount);
    if (ready.length && free.length) {
      const next = E.suggestNextMatch(state.matches.filter((m) => m.phase === phase || m.status === 'on-table'));
      if (next && next.phase === phase) { state = E.startOnTable(state, next.id, free[0], op()); continue; }
    }
    const playing = state.matches.find((m) => m.phase === phase && m.status === 'on-table');
    if (!playing) break;
    const c = op();
    const [a, b] = decide(playing, c.random);
    state = E.recordResult(state, playing.id, { score1: a, score2: b }, c);
  }
  return state;
}

export const randomRace = (race) => (m, random) => {
  const loser = Math.floor(random() * race);
  return random() < 0.5 ? [race, loser] : [loser, race];
};

export function settleShootouts(s, op) {
  let state = s;
  for (let guard = 0; guard < 200 && state.status === 'shootout'; guard += 1) {
    const active = E.activeShootout(state);
    const c = op();
    if (!active.lagWinnerId) { state = E.shootoutLag(state, active.order[c.random() < 0.5 ? 0 : 1], c); continue; }
    const r = E.replayShootout(active);
    state = E.shootoutRack(state, c.random() < 0.5 ? r.holderId : r.challengerId, c);
  }
  return state;
}

export function toBracket(n, opts = {}) {
  const { s, op } = startedEvent(n, opts);
  let state = playOpen(s, op, 'qualifying', opts.decide || randomRace(3));
  state = E.lockQualifying(state, op());
  return { s: settleShootouts(state, op), op };
}

export function toPlayoffs(n, opts = {}) {
  const { s, op } = toBracket(n, opts);
  return { s: E.confirmPlayoff(E.drawPlayoff(s, op()), op()), op };
}

/** Finds a seed whose qualifying (every match 3–0 to p1) ends in a cutoff shootout. */
export function shootoutEvent(n) {
  for (let seed = 1; seed <= 200; seed += 1) {
    const { s, op } = startedEvent(n, { seed });
    const state = E.lockQualifying(playOpen(s, op, 'qualifying', () => [3, 0]), op());
    if (state.status === 'shootout' && state.qualification.tie) return { s: state, op };
  }
  throw new Error('no seed produced a cutoff tie');
}

/** Finds a random-result event whose shootout leaves qualifiers above the tie and players below it. */
export function partialShootoutEvent(n = 12) {
  for (let seed = 1; seed <= 400; seed += 1) {
    const { s, op } = startedEvent(n, { seed });
    const state = E.lockQualifying(playOpen(s, op, 'qualifying', randomRace(3)), op());
    if (state.status !== 'shootout' || !state.qualification.tie) continue;
    const q = state.qualification;
    if (q.qualifierIds.length && q.qualifierIds.length + q.tie.tiedIds.length < n) return { s: state, op };
  }
  throw new Error('no seed produced a partial cutoff tie');
}

export function runToCompletion(s, op) {
  let state = playOpen(s, op, 'qualifying', randomRace(3));
  state = E.lockQualifying(state, op());
  state = settleShootouts(state, op);
  state = E.drawPlayoff(state, op());
  state = E.confirmPlayoff(state, op());
  state = playOpen(state, op, 'playoff', randomRace(5));
  return E.completeShowdown(state, op());
}
