export const USAPL_PLAY_TYPES = [
  { id: 'single', label: 'Single play' },
  { id: 'double', label: 'Double play' },
];

export function normalizeUsaplPlayType(value) {
  return String(value || '').trim().toLowerCase() === 'double' ? 'double' : 'single';
}

export function usaplPlayTypeLabel(value) {
  return normalizeUsaplPlayType(value) === 'double' ? 'Double play' : 'Single play';
}

export function usaplPlayMatches(playType) {
  return normalizeUsaplPlayType(playType) === 'double' ? 2 : 1;
}
