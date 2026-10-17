import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';

export function finalMatch(state) {
  if (!state.playoff?.templateId) return null;
  const key = finalRound(playoffTemplate(state.playoff.templateId)).key;
  return (state.matches || []).find((m) => m.phase === 'playoff' && m.roundKey === key) || null;
}

/**
 * Championship state:
 *   pending    — not decided yet
 *   decided    — the final has a winner (played, walkover, or Champion by Walkover when the
 *                other finalist position is empty)
 *   unresolved — no approved rule decides it: both finalists forfeited, or no eligible player can
 *                reach the final. Completion is blocked; the only path forward is correcting an
 *                earlier result.
 */
export function championshipStatus(state) {
  const final = finalMatch(state);
  if (!final || !state.playoff?.confirmedAt) return { status: 'pending', reason: '' };
  if (final.status === 'completed' && final.winnerId) return { status: 'decided', championId: final.winnerId, reason: '' };
  if (final.status === 'completed') {
    return { status: 'unresolved', reason: 'Both championship finalists forfeited. No champion and no championship payout can be awarded under the approved rules.' };
  }
  if (final.empty1 && final.empty2) {
    return { status: 'unresolved', reason: 'No player can reach the championship: both semifinal positions ended without a winner.' };
  }
  if ((final.empty1 && final.p2) || (final.empty2 && final.p1)) {
    return { status: 'unresolved', reason: 'The only player who reached the championship has withdrawn and the other finalist position is empty. No eligible finalist remains.' };
  }
  return { status: 'pending', reason: '' };
}
