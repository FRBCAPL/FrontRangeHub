/** Who paid: the captain and players on a team, offered when a payment isn't cash. */

export const PAYER_NAME_MAX = 60;
export const MAX_PLAYERS = 30;

export const cleanPayerName = (raw) => String(raw || '').replace(/\s+/g, ' ').trim().slice(0, PAYER_NAME_MAX);

/** Cash is handed over in person, so there's no one to match up. */
export const asksWhoPaid = (method) => Boolean(method) && String(method).trim().toLowerCase() !== 'cash';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export const teamPlayers = (team) => (Array.isArray(team?.players) ? team.players.filter(Boolean) : []);

/** Captain first, then players: [{ name, role: 'captain' | 'player' }], no repeats. */
export function teamPayers(team) {
  const out = [];
  const add = (raw, role) => {
    const name = cleanPayerName(raw);
    if (name && !out.some((p) => same(p.name, name))) out.push({ name, role });
  };
  add(team?.captain, 'captain');
  teamPlayers(team).forEach((n) => add(n, 'player'));
  return out;
}

/** Players list with `name` added, or null when that person is already on the team (or the list is full/blank). */
export function playersWith(team, raw) {
  const name = cleanPayerName(raw);
  if (!name || teamPayers(team).some((p) => same(p.name, name))) return null;
  const players = teamPlayers(team);
  return players.length >= MAX_PLAYERS ? null : [...players, name];
}

/** Text box (comma or new line separated) → clean, de-duplicated players list, leaving out the captain. */
export function parsePlayers(text, captain = '') {
  const out = [];
  const cap = cleanPayerName(captain);
  String(text || '').split(/[,\n]/).forEach((raw) => {
    const name = cleanPayerName(raw);
    if (name && !(cap && same(name, cap)) && !out.some((n) => same(n, name))) out.push(name);
  });
  return out.slice(0, MAX_PLAYERS);
}

/** Form "Paid by" dropdown: value = { pick, other }. With no names on the team it starts on Other. */
export const PAYER_OTHER = '__other__';
export const payerPick = (value, team) => value?.pick || (teamPayers(team).length ? '' : PAYER_OTHER);

/** Dropdown value → { name, isNew } (isNew = typed under Other, so it can be saved to the team). */
export function payerChoice(value, team) {
  if (payerPick(value, team) !== PAYER_OTHER) return { name: value?.pick || null, isNew: false };
  const name = cleanPayerName(value?.other);
  return { name: name || null, isNew: Boolean(name) };
}

/** "Venmo from Ana" / "Venmo" */
export const methodFrom = (method, paidBy) => [method, paidBy && `from ${paidBy}`].filter(Boolean).join(' ');
