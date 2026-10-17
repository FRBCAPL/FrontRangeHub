import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';
import { replayShootout, shootoutKind } from './showdownShootout.js';
import { computeEarnings } from './showdownEarnings.js';
import { standingsFor } from './showdownAdvance.js';
import { playoffMatches } from './showdownState.js';

function placeLabel(place, size) {
  return size > 1 ? `${place}\u2013${place + size - 1}` : String(place);
}

/** Players knocked out by a finished match: the loser, or both forfeiters of a double forfeit / vacated match. */
function eliminatedBy(m) {
  if (m.status !== 'completed') return [];
  if (m.loserId) return [m.loserId];
  return m.forfeitedBy || [];
}

const STAGE_NOTE = { 'double-forfeit': ' (double forfeit)', vacated: ' (withdrew)' };

/**
 * Final results: playoff placements by round reached (players out in the same round share a place),
 * then non-qualifiers in qualifying-rank order. An unresolved championship is shown as such — no champion is invented.
 */
export function finalStandings(state) {
  const earnings = computeEarnings(state).byPlayer;
  const withdrawn = new Set(state.players.filter((p) => p.withdrawnAt).map((p) => p.id));
  const shootoutOut = new Set((state.shootouts || []).filter((s) => shootoutKind(s) === 'cutoff').flatMap((s) => replayShootout(s).eliminated));
  const rows = [];
  const placed = new Set();
  const note = (id) => [withdrawn.has(id) ? 'Withdrew' : '', shootoutOut.has(id) && !placed.has(id) ? 'Lost in shootout' : ''].filter(Boolean).join(' \u00b7 ');
  const push = (id, place, label, stage) => {
    rows.push({ playerId: id, place, placeLabel: label, stage, earnings: earnings[id]?.total || 0, note: note(id) });
    placed.add(id);
  };

  if (state.playoff?.confirmedAt) {
    const template = playoffTemplate(state.playoff.templateId);
    const matches = playoffMatches(state);
    const final = matches.find((m) => m.roundKey === finalRound(template).key);
    const finalDecided = final?.status === 'completed' && final.winnerId;
    const finalFinishedOrBlocked = final?.status === 'completed' || final?.empty1 || final?.empty2;
    let place = 1;
    if (finalDecided) {
      push(final.winnerId, 1, '1', final.result === 'champion-walkover' ? 'Champion by Walkover' : 'Champion');
      if (final.loserId) push(final.loserId, 2, '2', 'Runner-up');
      place = 3;
    } else if (finalFinishedOrBlocked) {
      [final.p1, final.p2].filter(Boolean).forEach((id) => push(id, null, '', 'Championship unresolved'));
      place = 3;
    }
    if (finalDecided || finalFinishedOrBlocked) {
      [...template.rounds].reverse().slice(1).forEach((round) => {
        const out = matches.filter((m) => m.roundKey === round.key).flatMap((m) => eliminatedBy(m).map((id) => ({ id, m })));
        out.forEach(({ id, m }) => push(id, place, placeLabel(place, out.length), `Lost in ${round.label.toLowerCase()}${STAGE_NOTE[m.result] || ''}`));
        place += out.length;
      });
    }
  }

  standingsFor(state).rows.forEach((row) => {
    if (placed.has(row.playerId)) return;
    const qualified = state.qualification?.qualifierIds?.includes(row.playerId);
    rows.push({
      playerId: row.playerId,
      place: null,
      placeLabel: '',
      stage: qualified ? 'Playoffs' : `Qualifying rank ${row.rank}${row.tied ? ' (tied)' : ''}`,
      earnings: earnings[row.playerId]?.total || 0,
      note: note(row.playerId),
    });
  });
  return rows;
}
