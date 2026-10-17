import { forfeitResult, emptyPositionResult, CHAMPION_WALKOVER } from './showdownResults.js';
import { syncPlayoffPlayers } from './showdownPlayoff.js';
import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';
import { withdrawnIds, playoffMatches, replaceMatches, withAudit } from './showdownState.js';

/** What should happen automatically to an unfinished playoff match, or null to leave it. */
function automaticResult(m, out, isFinal, state, now) {
  const side1 = m.p1 || m.empty1;
  const side2 = m.p2 || m.empty2;
  if (!side1 || !side2) return null;
  if (m.empty1 || m.empty2) {
    const player = m.p1 || m.p2;
    if (isFinal) {
      // Exactly one eligible finalist: Champion by Walkover. No eligible finalist stays unresolved.
      return player && !(m.empty1 && m.empty2) && !out.has(player) ? emptyPositionResult(m, CHAMPION_WALKOVER, player, now) : null;
    }
    if (m.empty1 && m.empty2) return emptyPositionResult(m, 'empty', null, now);
    return emptyPositionResult(m, out.has(player) ? 'vacated' : 'admin-bye', player, now);
  }
  const gone = [m.p1, m.p2].filter((id) => out.has(id));
  if (!gone.length) return null;
  return { ...forfeitResult(m, gone, state.settings.playoffRaceTo, now), auto: 'withdrawal' };
}

/**
 * After playoffs are confirmed, resolves matches that cannot be played:
 * - a withdrawn player forfeits as soon as the opponent is known (walkover; both withdrawn = double forfeit)
 * - a match with an empty position is settled administratively (admin-bye / empty / vacated)
 * Repeats until nothing changes, because one resolution can empty or fill the next round.
 */
export function applyWalkovers(state, c) {
  if (!state.playoff?.confirmedAt) return state;
  const out = new Set(withdrawnIds(state));
  const finalKey = finalRound(playoffTemplate(state.playoff.templateId)).key;
  let matches = playoffMatches(state);
  const resolved = [];
  for (let guard = 0; guard < 16; guard += 1) {
    let changed = false;
    matches = matches.map((m) => {
      if (m.status === 'completed') return m;
      const next = automaticResult(m, out, m.roundKey === finalKey, state, c.now);
      if (!next) return m;
      changed = true;
      resolved.push(next);
      return next;
    });
    if (!changed) break;
    matches = syncPlayoffPlayers(matches);
  }
  const next = { ...state, matches: replaceMatches(state, 'playoff', matches) };
  return resolved.reduce((s, m) => withAudit(s, c, 'auto-result', [m.winnerId, ...(m.forfeitedBy || [])].filter(Boolean), {
    matchId: m.id, roundKey: m.roundKey, result: m.result, winnerId: m.winnerId, forfeitedBy: m.forfeitedBy || [], reason: m.auto,
  }), next);
}
