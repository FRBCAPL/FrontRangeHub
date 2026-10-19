import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { championshipStatus } from './showdownChampionship.js';
import { drawBracket, bracketProblems, downstreamOf, syncPlayoffPlayers } from './showdownPlayoff.js';
import { clearResult } from './showdownResults.js';
import { reconciliationProblem, earningsTotals } from './showdownEarnings.js';
import { applyWalkovers } from './showdownWalkovers.js';
import { context, findMatch, requireConfirm, requireStatus, withAudit, playoffMatches, replaceMatches } from './showdownState.js';
import { isPayoutV3 } from './showdownPayoutVersion.js';
import { v3LockedPlanProblem } from './v3/showdownV3Event.js';
import { computeEarningsV3, v3SettlementSnapshot } from './v3/showdownV3Money.js';

/** Draws (or redraws) the bracket. Nothing is earned until it is confirmed. */
export function drawPlayoff(state, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['bracket'], 'Qualification is not settled yet.');
  if (state.qualification?.short) throw new Error(`Not enough eligible players: ${state.qualification.short} playoff spot(s) cannot be filled.`);
  if (!state.playoffPlan) throw new Error('The playoff payouts are not locked yet.');
  const template = playoffTemplate(state.payoutPlan.templateId);
  const qualifierIds = state.qualification.qualifierIds;
  const byeIds = state.qualification.byeIds || [];
  const bracket = drawBracket({ templateId: template.id, qualifierIds, byeIds, random: c.random });
  const problems = bracketProblems(bracket, qualifierIds, byeIds);
  if (problems.length) throw new Error(problems[0]);
  const next = {
    ...state,
    playoff: { templateId: template.id, byes: bracket.byes, drawnAt: c.now, confirmedAt: null },
    matches: replaceMatches(state, 'playoff', bracket.matches),
  };
  return withAudit(next, c, state.playoff ? 'redraw-bracket' : 'draw-bracket', qualifierIds, { byes: bracket.byes });
}

/** Confirms the drawn bracket: playoffs open and bye payouts become earned. */
export function confirmPlayoff(state, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['bracket'], 'Qualification is not settled yet.');
  if (!state.playoff?.drawnAt) throw new Error('Draw the bracket first.');
  const next = { ...state, status: 'playoffs', playoff: { ...state.playoff, confirmedAt: c.now } };
  return withAudit(applyWalkovers(next, c), c, 'confirm-bracket', state.playoff.byes.map((b) => b.playerId));
}

/**
 * Clears a playoff result and everything it fed. Typed confirmation is required when a
 * later match had already started or finished.
 */
export function undoPlayoffFrom(state, matchId, confirmText, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['playoffs', 'completed'], 'Playoffs are not running.');
  if (isPayoutV3(state) && state.v3Outcome && state.v3Outcome.kind !== 'completed') {
    throw new Error('This V3 event was settled as interrupted or abandoned; its results are final.');
  }
  if (isPayoutV3(state) && (state.v3Adjustments || []).length) {
    throw new Error('Payout adjustments were recorded after this event was settled, so its results can no longer be undone.');
  }
  const match = findMatch(state, matchId);
  if (match.phase !== 'playoff' || match.status !== 'completed') throw new Error('Pick a finished playoff match.');
  if (match.auto === 'empty-position') throw new Error('This advancement is automatic. Correct or undo the earlier match that left the position empty.');
  const down = downstreamOf(playoffMatches(state), matchId);
  const started = state.matches.filter((m) => down.includes(m.id) && !m.auto && m.status !== 'waiting');
  if (started.length || state.status === 'completed') requireConfirm(confirmText);
  const clearIds = new Set([matchId, ...down]);
  const reset = playoffMatches(state).map((m) => (clearIds.has(m.id) ? clearResult(m) : m));
  let next = { ...state, status: 'playoffs', championId: null, completedAt: null, matches: replaceMatches(state, 'playoff', syncPlayoffPlayers(reset)) };
  if (isPayoutV3(state)) next = { ...next, v3Outcome: null, v3Settlement: null };
  next = applyWalkovers(next, c);
  return withAudit(next, c, 'undo-from', [...clearIds], { earningsBefore: earningsTotals(state) });
}

/** Finishes the event once the championship has a winner and every dollar reconciles. */
export function completeShowdown(state, ctxIn) {
  const c = context(ctxIn);
  requireStatus(state, ['playoffs'], 'Playoffs are not running.');
  const champ = championshipStatus(state);
  if (champ.status === 'unresolved') throw new Error(`Championship unresolved: ${champ.reason} Correct an earlier result to continue.`);
  if (champ.status !== 'decided') throw new Error('The championship match is not finished.');
  if (isPayoutV3(state)) return completeV3(state, champ.championId, c);
  const problem = reconciliationProblem(state);
  if (problem) throw new Error(`Payouts do not reconcile: ${problem}`);
  return withAudit({ ...state, status: 'completed', championId: champ.championId, completedAt: c.now }, c, 'complete', [champ.championId]);
}

/** V3 completion re-checks the locked plan, then saves the outcome and settlement with the event. */
function completeV3(state, championId, c) {
  const planProblem = v3LockedPlanProblem(state);
  if (planProblem) throw new Error(planProblem);
  const e = computeEarningsV3(state, { outcome: 'completed' });
  if (!e.settlement.ok) throw new Error(`Payouts do not reconcile: ${e.settlement.problems[0]}`);
  const v3Settlement = v3SettlementSnapshot(e.settlement, c.now);
  const next = {
    ...state, status: 'completed', championId, completedAt: c.now,
    v3Outcome: { kind: 'completed', at: c.now, by: c.by, stage: 'playoffs' }, v3Settlement,
  };
  return withAudit(next, c, 'complete', [championId], { outcome: 'completed', ...v3Settlement });
}
