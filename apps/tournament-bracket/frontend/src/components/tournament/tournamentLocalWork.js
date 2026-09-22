import { loadCashClimb } from './cash-climb/cashClimbStore.js';
import { loadElim } from './elimStore.js';
import { loadBreakAndRun } from './break-and-run/breakAndRunStore.js';

/** True when this browser still has a Cash Climb, Break and Run, or elim event that must not be dropped. */
export function hasLocalTournamentWork() {
  try {
    return Boolean(loadCashClimb() || loadBreakAndRun() || loadElim());
  } catch {
    return false;
  }
}

export function localTournamentWorkLabel() {
  if (loadCashClimb()) return 'Cash Climb';
  if (loadBreakAndRun()) return 'Break and Run';
  if (loadElim()) return 'elimination bracket';
  return 'tournament';
}
