export function splitUsaplPersonName(raw) {
  const value = String(raw || '').trim();
  if (!value) return { firstName: '', lastName: '' };
  if (value.includes(',')) {
    const [last, ...rest] = value.split(',').map((part) => part.trim()).filter(Boolean);
    return { firstName: rest.join(' '), lastName: last || '' };
  }
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function personKey(player) {
  return `${player.firstName || ''} ${player.lastName || ''}`.trim().toLowerCase();
}

export function playersFromDuezyTeam(team, emptyPlayer) {
  const captainBits = splitUsaplPersonName(team?.captainName);
  const captain = { ...emptyPlayer(), ...captainBits };
  const captainKey = personKey(captain);
  const extras = (team?.playerNames || [])
    .map((name) => ({ ...emptyPlayer(), ...splitUsaplPersonName(name) }))
    .filter((player) => {
      const key = personKey(player);
      return key && key !== captainKey;
    });
  return { captain, extras };
}
