/**
 * Where a V3 playoff stands, for settlement: the champion (if decided), the finalists and the players
 * still alive (qualified, not withdrawn, not eliminated). A player is eliminated by losing or forfeiting a
 * completed match, by a double forfeit, or by a vacated position.
 */
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';
import { paysMatchWin } from '../showdownResults.js';

export function v3PlayoffStatus(plan, playoffMatches, { qualifierIds = [], withdrawnIds = [] } = {}) {
  const finalKey = finalRound(playoffTemplate(plan.templateId)).key;
  const out = new Set(withdrawnIds);
  playoffMatches.forEach((m) => {
    if (m.status !== 'completed') return;
    if (m.loserId) out.add(m.loserId);
    (m.forfeitedBy || []).forEach((id) => out.add(id));
  });
  const final = playoffMatches.find((m) => m.roundKey === finalKey);
  const championId = final?.status === 'completed' && paysMatchWin(final) ? final.winnerId : null;
  const finalistIds = final ? [final.p1, final.p2].filter(Boolean) : [];
  const aliveIds = qualifierIds.filter((id) => !out.has(id));
  return { championId, finalistIds, aliveIds, finalMatch: final || null, started: playoffMatches.length > 0 };
}
