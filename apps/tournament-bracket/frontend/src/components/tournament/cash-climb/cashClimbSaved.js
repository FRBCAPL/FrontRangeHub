export function tournamentFromEventRow(row) {
  if (!row?.payload || typeof row.payload !== 'object') return null;
  return { ...row.payload, id: row.id || row.payload.id };
}

export function savedEventSummary(row) {
  const tournament = tournamentFromEventRow(row);
  if (!tournament?.id) return null;
  return {
    id: String(tournament.id),
    name: String(tournament.name || (tournament.type ? 'Pool Tournament' : 'Cash Climb')).trim() || 'Tournament',
    status: row.status || tournament.status || 'in-progress',
    type: tournament.type || '',
    tournamentDate: tournament.tournamentDate || '',
    updatedAt: row.updated_at || '',
    tournament,
  };
}

/** Local tablet copy wins. Cloud is used only when this device has no backup. */
export function preferLocalTournament(local, cloudLive) {
  if (local?.id) return local;
  if (cloudLive?.id) return cloudLive;
  return null;
}

export function savedStatusLabel(status) {
  if (status === 'completed') return 'Complete';
  if (status === 'ended') return 'Ended';
  if (status === 'in-progress') return 'In progress';
  return status || '';
}
