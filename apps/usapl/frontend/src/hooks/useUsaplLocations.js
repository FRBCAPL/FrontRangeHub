import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedUsaplLocationRows } from '../data/usaplLocations.js';
import { listUsaplLocations } from '../services/usaplLocations.js';

export function useUsaplLocations() {
  const [locations, setLocations] = useState(seedUsaplLocationRows);
  const [fromDatabase, setFromDatabase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listUsaplLocations();
      if (rows.length) {
        setLocations(rows);
        setFromDatabase(true);
      } else {
        setLocations(seedUsaplLocationRows());
        setFromDatabase(false);
      }
      setError('');
    } catch (err) {
      setLocations(seedUsaplLocationRows());
      setFromDatabase(false);
      setError(err?.message || 'Could not load locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const names = useMemo(() => locations.map((row) => row.name).filter(Boolean), [locations]);

  return { locations, names, loading, fromDatabase, error, reload };
}
