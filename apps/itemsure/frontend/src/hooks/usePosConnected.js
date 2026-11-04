import { useEffect, useState } from 'react';
import { getPosConnection } from '../services/itemsurePosService.js';

/** True once the business has a Clover connection (false while loading, or if it can't be read). */
export default function usePosConnected(organizationId) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let live = true;
    getPosConnection(organizationId)
      .then((r) => live && setConnected(Boolean(r.connection)))
      .catch(() => live && setConnected(false));
    return () => {
      live = false;
    };
  }, [organizationId]);
  return connected;
}
