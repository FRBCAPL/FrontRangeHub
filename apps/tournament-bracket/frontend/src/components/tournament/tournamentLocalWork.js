import { loadCashClimb } from './cash-climb/cashClimbStore.js';
import { loadElim } from './elimStore.js';

/** True when this browser still has a Cash Climb or elim event that must not be dropped. */
export function hasLocalTournamentWork() {
  try {
    return Boolean(loadCashClimb() || loadElim());
  } catch {
    return false;
  }
}

export function localTournamentWorkLabel() {
  if (loadCashClimb()) return 'Cash Climb';
  if (loadElim()) return 'elimination bracket';
  return 'tournament';
}
