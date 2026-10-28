import { useCallback, useEffect, useState } from 'react';
import { loadSession } from '../services/itemsureCountService.js';
import { listLocations } from '../services/itemsureLocationService.js';

/** Loads a count session with its snapshot items, entries, and location details. */
export default function useCountSession(organizationId, sessionId) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  const reload = useCallback(async () => {
    try {
      const [data, locations] = await Promise.all([loadSession(sessionId), listLocations(organizationId)]);
      if (!data) {
        setState({ loading: false, data: null, error: 'This count does not exist, or you do not have access to it.' });
        return null;
      }
      const location = locations.find((l) => l.id === data.session.location_id) || null;
      const next = { ...data, location, storageAreas: location?.storageAreas || [] };
      setState({ loading: false, data: next, error: '' });
      return next;
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: e.message }));
      return null;
    }
  }, [organizationId, sessionId]);

  useEffect(() => {
    setState({ loading: true, data: null, error: '' });
    reload();
  }, [reload]);

  return { ...state, reload };
}
