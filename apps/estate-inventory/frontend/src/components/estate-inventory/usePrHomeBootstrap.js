import { useEffect, useRef, useState } from 'react';
import {
  loadPrHomeCore,
  loadPrHomeFinance,
  reassemblePrHomeWithSettings
} from '@shared/services/estatePrHomeBootstrap.js';

/**
 * Shared PR home data for Needs Attention, What's Next, Status Strip, and Finance.
 * Core loads first; finance attaches without blocking the alert panels.
 */
export default function usePrHomeBootstrap({
  caseNumber,
  settings,
  refreshKey = 0
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(caseNumber));
  const [financeLoading, setFinanceLoading] = useState(Boolean(caseNumber));
  const [error, setError] = useState('');
  const seqRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Network load — only when case or explicit refresh changes (not settings hydrate).
  useEffect(() => {
    if (!caseNumber) {
      setData(null);
      setLoading(false);
      setFinanceLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const seq = ++seqRef.current;
    setData(null);
    setLoading(true);
    setFinanceLoading(true);
    setError('');

    (async () => {
      const core = await loadPrHomeCore(caseNumber, settingsRef.current || {});
      if (cancelled || seq !== seqRef.current) return;
      if (!core.success) {
        setError(core.error || 'Could not load home data.');
        setData(null);
        setLoading(false);
        setFinanceLoading(false);
        return;
      }
      setData(core.data);
      setLoading(false);

      const withFinance = await loadPrHomeFinance(
        caseNumber,
        core.data,
        settingsRef.current || {}
      );
      if (cancelled || seq !== seqRef.current) return;
      if (withFinance.success) {
        setData(withFinance.data);
      } else {
        setData((prev) =>
          prev
            ? {
                ...prev,
                financeError: withFinance.error || 'Could not load money overview.'
              }
            : prev
        );
      }
      setFinanceLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [caseNumber, refreshKey]);

  // Settings hydrate / Letters / inventory flags — rebuild completeness locally.
  useEffect(() => {
    if (!dataRef.current || !settings) return;
    setData((prev) => (prev ? reassemblePrHomeWithSettings(prev, settings) : prev));
  }, [
    settings?.updated_at,
    settings?.inventory_completed_at,
    settings?.letters_issued_at,
    settings?.closed_at
  ]);

  return { data, loading, financeLoading, error };
}
