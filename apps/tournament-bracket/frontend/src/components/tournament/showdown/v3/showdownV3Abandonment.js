/**
 * Complete voluntary playoff abandonment: the only ending that records proposed operator-retained funds.
 * It applies only when every playoff player who was not beaten in a played match left voluntarily: a
 * withdrawal during the playoffs the operator confirmed as voluntary, or a forfeit confirmed as voluntary.
 * Emergencies, venue closures, operator cancellations and other involuntary stops are interruptions.
 */
export const V3_INVOLUNTARY_MESSAGE = 'For an emergency, venue closure or operator decision, record an interruption instead.';

function leftVoluntarily(id, player, matches) {
  if (player?.withdrawnAt && player.withdrawnPhase === 'playoffs' && player.withdrawnVoluntarily === true) return true;
  return matches.some((m) => m.status === 'completed' && (m.forfeitedBy || []).includes(id) && m.voluntaryForfeit === true);
}

/** '' when the playoffs were abandoned voluntarily by everyone left; otherwise why not. */
export function v3AbandonmentProblem(state, status) {
  if (status.championId || status.aliveIds.length) return 'Players are still in the playoffs, so the event was not abandoned.';
  const matches = (state.matches || []).filter((m) => m.phase === 'playoff');
  if (matches.some((m) => m.result === 'interrupted')) return `A playoff match was interrupted, so this is not a voluntary abandonment. ${V3_INVOLUNTARY_MESSAGE}`;
  const players = new Map((state.players || []).map((p) => [p.id, p]));
  const beaten = new Set(matches.filter((m) => m.status === 'completed' && m.result === 'played' && m.loserId).map((m) => m.loserId));
  const remaining = (state.qualification?.qualifierIds || []).filter((id) => !beaten.has(id));
  const unverified = remaining.filter((id) => !leftVoluntarily(id, players.get(id), matches));
  if (unverified.length) {
    const names = unverified.map((id) => players.get(id)?.name || id).join(', ');
    return `Abandonment needs every remaining playoff player to have withdrawn or forfeited voluntarily. Not confirmed as voluntary: ${names}. ${V3_INVOLUNTARY_MESSAGE}`;
  }
  return '';
}

/** Who left voluntarily, for the audit record. */
export function v3VoluntaryLeavers(state) {
  const matches = (state.matches || []).filter((m) => m.phase === 'playoff');
  const beaten = new Set(matches.filter((m) => m.result === 'played' && m.loserId).map((m) => m.loserId));
  return (state.qualification?.qualifierIds || []).filter((id) => !beaten.has(id));
}
