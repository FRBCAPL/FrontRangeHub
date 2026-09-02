export function tournamentFromEventRow(row) {
  if (!row?.payload || typeof row.payload !== 'object') return null;
  return { ...row.payload, id: row.id || row.payload.id, updated_at: row.updated_at };
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

export function tournamentTime(tournament) {
  return Date.parse(tournament?.updated_at || '') || 0;
}

export function withTournamentTimestamp(tournament) {
  if (!tournament) return tournament;
  return { ...tournament, updated_at: new Date().toISOString() };
}

/**
 * Same event: newer copy wins so a second device can pick up.
 * Different events: keep this device's copy until the operator opens another.
 */
export function preferTournamentCopy(local, cloudLive) {
  if (!local?.id) return cloudLive || null;
  if (!cloudLive?.id) return local;
  if (String(local.id) !== String(cloudLive.id)) return local;
  return tournamentTime(cloudLive) > tournamentTime(local) ? cloudLive : local;
}

export function preferLocalTournament(local, cloudLive) {
  return preferTournamentCopy(local, cloudLive);
}

export function savedStatusLabel(status) {
  if (status === 'completed') return 'Complete';
  if (status === 'ended') return 'Ended';
  if (status === 'in-progress') return 'In progress';
  return status || '';
}
