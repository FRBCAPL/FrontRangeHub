import { useCallback, useEffect, useMemo, useState } from 'react';
import { USAPL_DIVISIONS, usaplDivisionSignupOpen } from '../data/usaplDivisions.js';
import { listUsaplDivisions } from '../services/usaplDivisions.js';

export function useUsaplDivisions({ signupOnly = false } = {}) {
  const [divisions, setDivisions] = useState(USAPL_DIVISIONS);
  const [fromDatabase, setFromDatabase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listUsaplDivisions();
      if (rows.length) {
        setDivisions(rows);
        setFromDatabase(true);
      } else {
        setDivisions(USAPL_DIVISIONS);
        setFromDatabase(false);
      }
      setError('');
    } catch (err) {
      setDivisions(USAPL_DIVISIONS);
      setFromDatabase(false);
      setError(err?.message || 'Could not load divisions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const visible = useMemo(
    () => (signupOnly ? divisions.filter(usaplDivisionSignupOpen) : divisions),
    [divisions, signupOnly]
  );

  return { divisions: visible, allDivisions: divisions, loading, fromDatabase, error, reload };
}
