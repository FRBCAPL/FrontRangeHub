import { useEffect, useState } from 'react';

/** Current time, refreshed every minute so a tab left open overnight rolls over to the new day. */
export default function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
