export function elimEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `elim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function elimIdsEqual(a, b) {
  if (a == null || b == null || a === '' || b === '') return false;
  return String(a) === String(b);
}

export function elimChampion(tournament) {
  if (!tournament) return '';
  if (tournament.type === 'double') return String(tournament.grandFinal?.winner || '').trim();
  const rounds = tournament.rounds || [];
  const finalMatch = rounds[rounds.length - 1]?.matches?.[0];
  return String(finalMatch?.winner || '').trim();
}

export function elimFormatLabel(type) {
  if (type === 'double') return 'Double elimination';
  if (type === 'single') return 'Single elimination';
  return '';
}

export function withElimStatus(tournament, nextStatus) {
  if (!tournament) return tournament;
  const champion = elimChampion(tournament);
  let status = nextStatus || tournament.status || 'in-progress';
  if (champion) status = 'completed';
  else if (status !== 'ended') status = 'in-progress';
  return {
    ...tournament,
    id: tournament.id || elimEventId(),
    status,
    champion: champion || tournament.champion || '',
  };
}

export function isValidElim(tournament) {
  return Boolean(tournament && Array.isArray(tournament.entrantNames) && tournament.entrantNames.length >= 2);
}
