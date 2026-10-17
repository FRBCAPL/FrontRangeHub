/**
 * Every operator button goes through runAction, so screens never edit event state directly.
 * Each action is an engine call: it either returns the next state or throws a plain-English error.
 */
import * as E from '../showdownEngine.js';

function scoreValue(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('Enter both players\u2019 game scores.');
  return Number(text);
}

function phaseOf(state) {
  return state.status === 'playoffs' ? 'playoff' : 'qualifying';
}

export const ACTIONS = {
  updateDetails: (s, c, patch) => E.updateDetails(s, patch, c),
  updateSettings: (s, c, patch) => E.updateSettings(s, patch, c),
  addPlayer: (s, c, player) => E.addPlayer(s, player, c),
  removePlayer: (s, c, id) => E.removePlayer(s, id, c),
  updatePlayer: (s, c, id, patch) => E.updatePlayer(s, id, patch, c),
  start: (s, c) => E.startShowdown(s, c),
  startMatch: (s, c, matchId, table) => E.startOnTable(s, matchId, Number(table), c),
  startSuggested: (s, c, table) => {
    const next = E.suggestNextMatch(s.matches.filter((m) => m.phase === phaseOf(s)));
    if (!next) throw new Error('No match is ready to start. Players may still be on other tables.');
    return E.startOnTable(s, next.id, Number(table), c);
  },
  moveTable: (s, c, matchId, table) => E.changeTable(s, matchId, Number(table), c),
  takeOffTable: (s, c, matchId) => E.takeOffTable(s, matchId, c),
  hold: (s, c, matchId, on) => E.holdMatch(s, matchId, on, c),
  recordScore: (s, c, matchId, score1, score2) => E.recordResult(s, matchId, { score1: scoreValue(score1), score2: scoreValue(score2) }, c),
  forfeit: (s, c, matchId, ids) => E.recordForfeit(s, matchId, ids, c),
  withdraw: (s, c, id) => E.withdrawPlayer(s, id, c),
  reinstate: (s, c, id) => E.reinstatePlayer(s, id, c),
  lockQualifying: (s, c) => E.lockQualifying(s, c),
  reopenQualifying: (s, c, confirmText) => E.reopenQualifying(s, confirmText, c),
  shootoutLag: (s, c, id) => E.shootoutLag(s, id, c),
  shootoutRack: (s, c, id) => E.shootoutRack(s, id, c),
  shootoutUndo: (s, c) => E.shootoutUndo(s, c),
  reopenShootout: (s, c, confirmText) => E.reopenShootout(s, confirmText, c),
  drawBracket: (s, c) => E.drawPlayoff(s, c),
  confirmBracket: (s, c) => E.confirmPlayoff(s, c),
  undoFrom: (s, c, matchId, confirmText) => E.undoPlayoffFrom(s, matchId, confirmText, c),
  complete: (s, c) => E.completeShowdown(s, c),
  approvePhone: (s, c, sub) => E.approvePhoneResult(s, sub, c),
  rejectPhone: (s, c, sub, reason) => E.rejectPhoneResult(s, sub, reason, c),
};

export function currentOperator() {
  try {
    return localStorage.getItem('userEmail') || 'operator';
  } catch {
    return 'operator';
  }
}

/** Runs one named action. Never throws: returns { state, error }. */
export function runAction(state, name, args = [], ctx = {}) {
  const fn = ACTIONS[name];
  if (!fn) return { state, error: `Unknown action: ${name}` };
  try {
    const c = { by: ctx.by || currentOperator(), ...ctx };
    return { state: fn(state, c, ...args), error: '' };
  } catch (err) {
    return { state, error: err?.message || 'That did not work.' };
  }
}

/** The one thing the operator should do next, in plain English. */
export function nextStep(state) {
  const phase = state.matches.filter((m) => m.phase === phaseOf(state));
  const open = phase.filter((m) => m.status !== 'completed').length;
  const free = E.freeTables(state.matches, state.settings.tableCount).length;
  const ready = E.readyMatches(phase).length;
  switch (state.status) {
    case 'setup': {
      const problems = E.setupProblems(state);
      return problems.length ? problems[0] : 'Ready. Review the payout schedule, then start qualifying.';
    }
    case 'qualifying':
      if (!open) return 'Every qualifying match is finished. Review standings and lock qualifying.';
      if (ready && free) return `${open} qualifying match${open === 1 ? '' : 'es'} left. Start the next match on an open table.`;
      return `${open} qualifying match${open === 1 ? '' : 'es'} left. Record results as tables finish.`;
    case 'shootout': {
      const sh = E.activeShootout(state);
      const bye = E.shootoutKind(sh) === 'bye';
      if (!sh?.lagWinnerId) {
        return bye
          ? 'Qualifiers are tied for the last quarterfinal bye. Record who wins the lag to start the bye shootout.'
          : 'A tie crosses the playoff cutoff. Record who wins the lag to start the shootout.';
      }
      return bye ? 'Bye shootout in progress. Record each rack winner.' : 'Shootout in progress. Record each rack winner.';
    }
    case 'bracket':
      if (state.qualification?.short) return `Not enough eligible players: ${state.qualification.short} playoff spot(s) cannot be filled.`;
      if (!state.playoff?.drawnAt) return 'Qualifying is settled. Draw the playoff bracket.';
      return 'Review the drawn bracket, then confirm it to open the playoffs.';
    case 'playoffs':
      if (E.championshipStatus(state).status === 'unresolved') return 'Championship unresolved. Open the Bracket tab: an earlier result must be corrected before the event can finish.';
      if (!open) return 'The championship is decided. Check the money, then complete the event.';
      if (ready && free) return `${open} playoff match${open === 1 ? '' : 'es'} left. Start the next match on an open table.`;
      return `${open} playoff match${open === 1 ? '' : 'es'} left. Record results as tables finish.`;
    case 'completed':
      return 'Event complete. Every dollar is paid out.';
    default:
      return '';
  }
}
