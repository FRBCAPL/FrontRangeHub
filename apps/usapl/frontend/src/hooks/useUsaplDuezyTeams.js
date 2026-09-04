import { useCallback, useEffect, useState } from 'react';
import { listUsaplDuezyPublicRosters } from '../services/usaplDuezyTeams.js';

export function useUsaplDuezyTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTeams(await listUsaplDuezyPublicRosters());
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { teams, loading, reload };
}
