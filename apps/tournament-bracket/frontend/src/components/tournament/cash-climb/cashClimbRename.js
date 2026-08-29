function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

export function parsePlayerName(value) {
  const name = String(value || '').trim();
  if (!name) throw new Error('Enter a player name.');
  if (name.length > 80) throw new Error('Player name is too long.');
  return name;
}

export function cashClimbRoster(state) {
  const players = state?.players || [];
  if (players.length) {
    return players.map((p) => ({ id: p.id, name: p.name || '' }));
  }
  return (state?.stats || []).map((p) => ({ id: p.player_id, name: p.player_name || '' }));
}

function knownPlayer(state, playerId) {
  if (!playerId) return false;
  return (state.players || []).some((p) => p.id === playerId)
    || (state.stats || []).some((p) => p.player_id === playerId);
}

function applyOneName(state, playerId, name) {
  (state.players || []).forEach((p) => {
    if (p.id === playerId) p.name = name;
  });
  (state.stats || []).forEach((p) => {
    if (p.player_id === playerId) p.player_name = name;
  });
  (state.matches || []).forEach((match) => {
    if (match.player1_id === playerId) match.player1_name = name;
    if (match.player2_id === playerId) match.player2_name = name;
    if (match.winner_id === playerId) match.winner_name = name;
    if (match.loser_id === playerId) match.loser_name = name;
  });
  if (state.winner?.player_id === playerId) {
    state.winner.player_name = name;
  }
}

export function applyPlayerNames(state, updates) {
  if (!state) throw new Error('No tournament to edit.');
  const list = Array.isArray(updates) ? updates : [];
  list.forEach((row) => {
    const playerId = row?.id || row?.player_id;
    if (!playerId) throw new Error('Unknown player.');
    if (!knownPlayer(state, playerId)) throw new Error('Unknown player.');
    applyOneName(state, playerId, parsePlayerName(row.name));
  });
  return state;
}

export function renameCashClimbPlayers(state, updates) {
  return applyPlayerNames(clone(state), updates);
}
