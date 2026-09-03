import { useCallback, useEffect, useState } from 'react';
import { USAPL_VEGAS_CUP } from '../data/usaplVegasCup.js';
import { normalizeUsaplTeamKey } from '../data/usaplVegasSeeds.js';
import {
  addUsaplVegasIneligible,
  isUsaplVegasIneligibleTableError,
  listUsaplVegasIneligible,
  removeUsaplVegasIneligible,
  USAPL_VEGAS_INELIGIBLE_SQL,
} from '../services/usaplVegasIneligible.js';

export function useUsaplVegasIneligible(year = USAPL_VEGAS_CUP.year) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [busyKey, setBusyKey] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listUsaplVegasIneligible(year));
      setTableMissing(false);
      setError('');
    } catch (err) {
      setRows([]);
      const missing = isUsaplVegasIneligibleTableError(err);
      setTableMissing(missing);
      setError(missing ? USAPL_VEGAS_INELIGIBLE_SQL : (err?.message || 'Could not load Vegas eligibility.'));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setEligible = useCallback(async (teamName, eligible) => {
    setBusyKey(normalizeUsaplTeamKey(teamName));
    setError('');
    try {
      if (eligible) await removeUsaplVegasIneligible(teamName, year);
      else await addUsaplVegasIneligible(teamName, { year, reason: 'No longer active' });
      await reload();
    } catch (err) {
      setError(err?.message || 'Could not update Vegas eligibility.');
      throw err;
    } finally {
      setBusyKey('');
    }
  }, [reload, year]);

  return { rows, loading, error, tableMissing, busyKey, setEligible, reload };
}
