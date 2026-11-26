export const RACE_LENGTHS = [2, 3, 5, 7, 9];
export const BEST_OF_LENGTHS = [3, 5, 7, 9];
export const DEFAULT_MATCH = { type: 'single', length: 1 };

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

export function matchLabel(match) {
  if (!match || match.type === 'single') return 'Single game';
  if (match.type === 'race') return `Race to ${match.length}`;
  if (match.type === 'bestof') return `Best of ${match.length}`;
  return 'Single game';
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
