/** Test-only: plays an event the way an operator would, using only runAction and view data. */
import { runAction } from './showdownOperatorActions.js';
import { queueView, shootoutView } from './showdownView.js';
import { bracketView, moneyView, standingsView } from './showdownBoardView.js';
import { createShowdown } from '../showdownEngine.js';
import { operator } from '../showdownTestKit.js';

export function makeOperator(seed = 1) {
  const op = operator(seed);
  const log = [];
  const tap = (state, name, ...args) => {
    const c = op();
    const out = runAction(state, name, args, c);
    log.push({ name, args, error: out.error });
    if (out.error) throw new Error(`${name}: ${out.error}`);
    return out.state;
  };
  const tryTap = (state, name, ...args) => runAction(state, name, args, op());
  return { op, tap, tryTap, log };
}

/** Setup screen: a fresh event with players typed in one by one. */
export function setUpEvent(o, n, { fee = 20, tables = 5, payoutVersion = 1 } = {}) {
  let s = createShowdown({ name: `Showdown ${n}`, presetId: 'legends', payoutVersion }, o.op());
  s = o.tap(s, 'updateSettings', { entryFee: fee, tableCount: tables });
  for (let i = 1; i <= n; i += 1) s = o.tap(s, 'addPlayer', { name: `Player ${i}` });
  return o.tap(s, 'start');
}

const score = (race, random) => {
  const loser = Math.floor(random() * race);
  return random() < 0.5 ? [race, loser] : [loser, race];
};

/** Works the match board until the phase has nothing left to start or record. */
export function workBoard(o, s, phase, decide) {
  let state = s;
  for (let guard = 0; guard < 400; guard += 1) {
    const q = queueView(state, phase);
    if (q.ready.length && q.freeTables.length) {
      state = o.tap(state, 'startSuggested', q.freeTables[0]);
      continue;
    }
    const m = q.onTable[0];
    if (!m) break;
    const race = phase === 'qualifying' ? state.settings.qualifyingRaceTo : state.settings.playoffRaceTo;
    const [a, b] = decide ? decide(m, state) : score(race, o.op().random);
    state = o.tap(state, 'recordScore', m.id, String(a), String(b));
  }
  return state;
}

export function workShootouts(o, s) {
  let state = s;
  for (let guard = 0; guard < 200 && state.status === 'shootout'; guard += 1) {
    const v = shootoutView(state);
    const coin = o.op().random() < 0.5;
    if (v.status === 'lag') state = o.tap(state, 'shootoutLag', v.lagPlayers[coin ? 0 : 1].id);
    else state = o.tap(state, 'shootoutRack', coin ? v.holder.id : v.challenger.id);
  }
  return state;
}

export function playFullEvent(o, s, decideQualifying) {
  let state = workBoard(o, s, 'qualifying', decideQualifying);
  state = o.tap(state, 'lockQualifying');
  state = workShootouts(o, state);
  state = o.tap(state, 'drawBracket');
  state = o.tap(state, 'confirmBracket');
  state = workBoard(o, state, 'playoff');
  return o.tap(state, 'complete');
}

export { bracketView, moneyView, standingsView, queueView, shootoutView };
