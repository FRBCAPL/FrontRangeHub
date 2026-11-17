import { useEffect, useMemo, useState } from 'react';
import { listApprovedCounts } from '../services/itemsurePosSalesService.js';
import { getPosConnection } from '../services/itemsurePosService.js';
import {
  buildCloverReady,
  cloverReadyVisitedKey,
} from '../utils/itemsureCloverReady.js';
import usePosSetup from './usePosSetup.js';

function readVisited(orgId) {
  try {
    return window.localStorage.getItem(cloverReadyVisitedKey(orgId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Home path to first trusted Sales vs counts + confidence %.
 * Loads Clover connection, setup leftovers, and approved count count.
 */
export default function useCloverReady(organizationId, { enabled = true } = {}) {
  const [connected, setConnected] = useState(null);
  const [approvedCount, setApprovedCount] = useState(null);
  const [visitedReport, setVisitedReport] = useState(() => (organizationId ? readVisited(organizationId) : false));
  const [error, setError] = useState('');

  const posOn = enabled && connected === true;
  const { summary: pos, error: posError } = usePosSetup(organizationId, 0, {
    enabled: posOn,
    needsConnection: true,
  });

  useEffect(() => {
    if (!enabled || !organizationId) return undefined;
    let alive = true;
    setVisitedReport(readVisited(organizationId));
    (async () => {
      try {
        const [{ connection, salesReady }, counts] = await Promise.all([
          getPosConnection(organizationId),
          listApprovedCounts(organizationId).catch(() => []),
        ]);
        if (!alive) return;
        setConnected(Boolean(connection && salesReady));
        setApprovedCount(counts.length);
        setError('');
      } catch (e) {
        if (!alive) return;
        setConnected(false);
        setApprovedCount(0);
        setError(e.message || 'Could not load Clover readiness');
      }
    })();
    return () => {
      alive = false;
    };
  }, [organizationId, enabled]);

  const snapshot = useMemo(() => {
    if (!enabled) return null;
    if (connected === null || approvedCount === null) return null;
    if (connected && !pos) return null; // wait for setup when connected
    return buildCloverReady({
      connected,
      pos: connected ? pos : { off: true },
      approvedCount,
      visitedReport,
    });
  }, [enabled, connected, approvedCount, pos, visitedReport]);

  return {
    snapshot,
    error: error || posError || '',
    loading: enabled && snapshot === null && !error && !posError,
  };
}
