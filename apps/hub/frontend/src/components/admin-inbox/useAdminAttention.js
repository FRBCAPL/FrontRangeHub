import { useCallback, useEffect, useState } from 'react';
import { loadAttentionSummary } from './adminAttentionService.js';
import { totalCount } from './adminAttentionSources.js';

const POLL_MS = 60000;

/** Polls the admin attention summary every minute (and when the tab regains focus). Idle when disabled. */
export default function useAdminAttention(enabled) {
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(enabled));
  const [checkedAt, setCheckedAt] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setCounts(await loadAttentionSummary());
      setError('');
      setCheckedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts({});
      return undefined;
    }
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [enabled, refresh]);

  return { counts, total: totalCount(counts), error, loading, checkedAt, refresh };
}
