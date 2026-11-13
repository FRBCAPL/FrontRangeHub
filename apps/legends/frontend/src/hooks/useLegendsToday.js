import { useEffect, useState } from 'react';
import { fetchLegendsSummary } from '../services/legendsTodayService.js';

const REFRESH_MS = 75_000;

/** Polls the CueSync summary while the tab is visible. `loaded` turns true after the first answer or failure. */
export default function useLegendsToday() {
  const [summary, setSummary] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    let lastFetch = 0;
    let inFlight = false;

    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      lastFetch = Date.now();
      try {
        const next = await fetchLegendsSummary();
        if (!cancelled) setSummary(next);
      } catch {
        // Keep showing the last good summary; it is hidden once it goes stale.
      } finally {
        inFlight = false;
        if (!cancelled) {
          setLoaded(true);
          setNow(new Date());
        }
      }
    }

    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, REFRESH_MS);
    function onVisibility() {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch >= REFRESH_MS) refresh();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { summary, loaded, now };
}
