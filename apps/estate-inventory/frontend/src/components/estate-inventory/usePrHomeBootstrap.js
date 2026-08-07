import { useEffect, useRef, useState } from 'react';
import { loadPrHomeBootstrap } from '@shared/services/estatePrHomeBootstrap.js';

/**
 * Shared PR home data for Needs Attention, What's Next, Status Strip, and Finance.
 */
export default function usePrHomeBootstrap({
  caseNumber,
  settings,
  refreshKey = 0
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(caseNumber));
  const [error, setError] = useState('');
  const seqRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!caseNumber) {
      setData(null);
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');

    (async () => {
      const result = await loadPrHomeBootstrap(caseNumber, settingsRef.current || {});
      if (cancelled || seq !== seqRef.current) return;
      if (!result.success) {
        setError(result.error || 'Could not load home data.');
        setData(null);
        setLoading(false);
        return;
      }
      setData(result.data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    caseNumber,
    refreshKey,
    settings?.updated_at,
    settings?.inventory_completed_at,
    settings?.letters_issued_at,
    settings?.closed_at
  ]);

  return { data, loading, error };
}
