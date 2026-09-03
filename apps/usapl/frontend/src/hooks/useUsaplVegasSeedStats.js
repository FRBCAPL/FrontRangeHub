import { useMemo } from 'react';
import { USAPL_VEGAS_CUP } from '../data/usaplVegasCup.js';
import { usaplVegasPendingSlots, usaplVegasSeedByTeam, usaplVegasSeedResult } from '../data/usaplVegasSeeds.js';
import { useUsaplDivisions } from './useUsaplDivisions.js';
import { useUsaplVegasIneligible } from './useUsaplVegasIneligible.js';

export function useUsaplVegasSeedStats(year = USAPL_VEGAS_CUP.year) {
  const { allDivisions, loading: divisionsLoading } = useUsaplDivisions();
  const ineligibleState = useUsaplVegasIneligible(year);
  const result = useMemo(
    () => usaplVegasSeedResult(allDivisions, year, ineligibleState.rows),
    [allDivisions, ineligibleState.rows, year]
  );
  const stats = useMemo(
    () => usaplVegasSeedByTeam([...result.board, ...result.ineligible]),
    [result]
  );
  const pending = useMemo(() => usaplVegasPendingSlots(allDivisions, year), [allDivisions, year]);

  return {
    allDivisions,
    loading: divisionsLoading || ineligibleState.loading,
    board: result.board,
    ineligible: result.ineligible,
    pending,
    stats,
    setEligible: ineligibleState.setEligible,
    busyKey: ineligibleState.busyKey,
    tableMissing: ineligibleState.tableMissing,
    error: ineligibleState.error,
  };
}
