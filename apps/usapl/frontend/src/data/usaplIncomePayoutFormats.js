import { usaplPlayMatches } from './usaplIncomePlayType.js';

export function usaplFormatPoolCents(combinedCents, playType) {
  const total = Math.max(0, Math.round(Number(combinedCents) || 0));
  const matches = usaplPlayMatches(playType);
  if (matches <= 1) return total;
  return Math.floor(total / matches);
}
