export const RACE_LENGTHS = [2, 3, 5, 7, 9];
export const BEST_OF_LENGTHS = [3, 5, 7, 9];
export const BREAK_RULES = [
  { id: 'winner', label: 'Winner breaks' },
  { id: 'alternate', label: 'Alternate' },
  { id: 'loser', label: 'Loser breaks' }
];
export const DEFAULT_MATCH = { type: 'single', length: 1, breakRule: 'alternate' };

export function nextBreaker({ breakRule = 'alternate', lastBreaker = 1, winner }) {
  if (breakRule === 'winner') return winner;
  if (breakRule === 'loser') return winner === 1 ? 2 : 1;
  return lastBreaker === 1 ? 2 : 1;
}

export function customLength(value, { min, max, odd = false }) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  if (odd && n % 2 === 0) return null;
  return n;
}

export function gamesNeeded(match) {
  if (!match || match.type === 'single') return 1;
  const length = Math.max(1, Number(match.length) || 1);
  if (match.type === 'race') return length;
  if (match.type === 'bestof') return Math.ceil(length / 2);
  return 1;
}

export function leadingWinner(scores, match) {
  const need = gamesNeeded(match);
  if ((scores?.[1] || 0) >= need) return 1;
  if ((scores?.[2] || 0) >= need) return 2;
  return null;
}

export function breakRuleLabel(breakRule) {
  if (breakRule === 'winner') return 'Winner breaks';
  if (breakRule === 'loser') return 'Loser breaks';
  return 'Alternate break';
}

export function matchLabel(match) {
  const breakBit = match?.breakRule ? ` · ${breakRuleLabel(match.breakRule)}` : '';
  if (!match || match.type === 'single') return `Single game${breakBit}`;
  if (match.type === 'race') return `Race to ${match.length}${breakBit}`;
  if (match.type === 'bestof') return `Best of ${match.length}${breakBit}`;
  return `Single game${breakBit}`;
}

export function matchWinLine(name, match) {
  if (!match || match.type === 'single') return `${name} wins`;
  if (match.type === 'race') return `${name} wins the race`;
  return `${name} wins the set`;
}

export function matchWonLabel(match) {
  if (!match || match.type === 'single') return 'Won';
  if (match.type === 'race') return 'Race won';
  return 'Set won';
}
